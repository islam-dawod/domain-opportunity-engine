import type { SearchTask, DomainStatus, PurchaseMode, SearchProfile } from './types'
import { uid } from './util'

// Topic dictionary maps Hebrew/English words in the prompt to canonical keywords.
const TOPIC_MAP: { match: RegExp; topic: string; keywords: string[] }[] = [
  { match: /(הגיר|ויז[הות]|visa|migrat|immigration|relocat)/i, topic: 'הגירה', keywords: ['visa', 'migrate', 'immigration', 'relocation', 'global'] },
  { match: /(משפט|עורכ[יי] דין|legal|law|attorney|lawyer)/i, topic: 'משפטים', keywords: ['legal', 'law', 'attorney', 'counsel', 'rights'] },
  { match: /(נדל|real ?estate|property|realty)/i, topic: 'נדל״ן', keywords: ['estate', 'property', 'realty', 'homes', 'invest'] },
  { match: /(טכנולוג|tech|software|saas|ai|startup)/i, topic: 'טכנולוגיה', keywords: ['tech', 'app', 'cloud', 'labs', 'ai'] },
  { match: /(פיננס|finance|fintech|bank|invest|כספ)/i, topic: 'פיננסים', keywords: ['finance', 'capital', 'pay', 'fund', 'wealth'] },
  { match: /(בריאות|health|medical|clinic|רפוא)/i, topic: 'בריאות', keywords: ['health', 'care', 'clinic', 'med', 'wellness'] },
  { match: /(חינוך|education|learn|academy|קורס)/i, topic: 'חינוך', keywords: ['learn', 'academy', 'edu', 'school', 'skill'] },
]

const STATUS_WORDS: { match: RegExp; status: DomainStatus }[] = [
  { match: /pending ?delete|פנדינג|מחיקה/i, status: 'PendingDelete' },
  { match: /available|פנוי|זמין לרישום|לרישום/i, status: 'Available' },
  { match: /auction|מכרז/i, status: 'Auction' },
  { match: /closeout|clearance|סגירה/i, status: 'Closeout' },
  { match: /redemption|שחזור/i, status: 'Redemption' },
  { match: /expired|פג תוק|grace/i, status: 'Expired' },
]

function parsePrice(text: string): { amount?: number; currency?: 'USD' | 'EUR' | 'ILS' } {
  // "$500", "750 USD", "עד 750 דולר", "500 שקל", "300 יורו"
  const dollar = text.match(/\$\s*([\d,]+)/)
  if (dollar) return { amount: num(dollar[1]), currency: 'USD' }
  const withCur = text.match(/([\d,]+)\s*(usd|dollar|דולר|eur|euro|יורו|ils|shekel|שקל|ש"ח|ש״ח)/i)
  if (withCur) {
    const c = withCur[2].toLowerCase()
    const currency = /eur|euro|יורו/.test(c) ? 'EUR' : /ils|shekel|שקל|ש/.test(c) ? 'ILS' : 'USD'
    return { amount: num(withCur[1]), currency }
  }
  const budgetPhrase = text.match(/(?:עד|תקציב(?:\s+של)?(?:\s+עד)?|budget(?:\s+of)?(?:\s+up\s+to)?|up\s+to|max)\s*[:\-]?\s*([\d,]+)/i)
  if (budgetPhrase) return { amount: num(budgetPhrase[1]), currency: undefined }
  return {}
}

function num(s: string): number {
  return parseInt(s.replace(/[,\s]/g, ''), 10)
}

function parseDuration(text: string): number | undefined {
  if (/שבועיים|two weeks|2 weeks/i.test(text)) return 14
  if (/שבוע\b|one week|1 week/i.test(text)) return 7
  if (/חודש|month/i.test(text)) return 30
  const days = text.match(/(?:במשך|for|למשך)?\s*(\d+)\s*(?:יום|ימים|days?|d)\b/i)
  if (days) return num(days[1])
  return undefined
}

function parseTlds(text: string): string[] {
  const found = new Set<string>()
  const re = /(?:^|[^a-z])(?:\.)?(com|net|org|io|co|ai|app|dev|xyz|me|tech|law)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) found.add('.' + m[1].toLowerCase())
  // "רק com" / "only com" heuristics already covered.
  return [...found]
}

function parseMode(text: string): PurchaseMode | undefined {
  if (/auto-?buy|רכישה אוטומט|קנייה אוטומט|אוטומטי/i.test(text)) return 'auto'
  if (/approv|אישור/i.test(text)) return 'approve'
  if (/notify|התרא|תתריע|תריע/i.test(text)) return 'notify'
  if (/monitor|מעקב בלבד|רק מעקב/i.test(text)) return 'monitor'
  return undefined
}

export function interpret(prompt: string, profile: SearchProfile): SearchTask {
  const inferred: SearchTask['inferred'] = {}
  const set = (k: string, src: 'command' | 'profile' | 'default') => (inferred[k] = src)

  // topics + keywords
  const topics: string[] = []
  const keywords = new Set<string>()
  for (const t of TOPIC_MAP) {
    if (t.match.test(prompt)) {
      topics.push(t.topic)
      t.keywords.forEach((k) => keywords.add(k))
    }
  }
  if (topics.length) set('keywords', 'command')
  else {
    profile.keywords.forEach((k) => keywords.add(k))
    profile.topics.forEach((t) => topics.push(t))
    set('keywords', 'profile')
  }

  // language
  let language: SearchTask['language'] = 'Any'
  if (/אנגלית|english/i.test(prompt)) { language = 'English'; set('language', 'command') }
  else if (/עברית|hebrew/i.test(prompt)) { language = 'Hebrew'; set('language', 'command') }
  else set('language', 'default')

  // tlds
  let tlds = parseTlds(prompt)
  if (tlds.length) set('tlds', 'command')
  else { tlds = profile.tlds; set('tlds', 'profile') }

  // max length
  const lenMatch = prompt.match(/(?:עד|up to|max(?:imum)?|)\s*(\d{1,2})\s*(?:תווים|characters?|chars?|letters?|אותיות)/i)
  let maxLength = 15
  if (lenMatch) { maxLength = num(lenMatch[1]); set('maxLength', 'command') } else set('maxLength', 'default')

  // price + currency
  const price = parsePrice(prompt)
  let maxPrice = profile.maxPrice
  let currency = profile.currency
  if (price.amount) { maxPrice = price.amount; set('maxPrice', 'command') } else set('maxPrice', 'profile')
  if (price.currency) currency = price.currency

  // minimum score
  const scoreMatch = prompt.match(/(?:ציון|score)\s*(\d{2,3})\s*(?:ומעלה|ומעל|\+|and up|or (?:higher|above))?/i)
    || prompt.match(/(?:בציון|סף ציון|minimum score|min score)\s*(?:של\s*)?(\d{2,3})/i)
  let minimumScore = profile.minimumScore
  if (scoreMatch) { minimumScore = num(scoreMatch[1]); set('minimumScore', 'command') } else set('minimumScore', 'profile')

  // statuses
  const statuses = new Set<DomainStatus>()
  for (const s of STATUS_WORDS) if (s.match.test(prompt)) statuses.add(s.status)
  if (statuses.size) set('statuses', 'command')
  else { ['PendingDelete', 'Auction', 'Closeout', 'Available', 'Expired', 'Redemption'].forEach((s) => statuses.add(s as DomainStatus)); set('statuses', 'default') }

  // duration
  const dur = parseDuration(prompt)
  const durationDays = dur ?? 14
  set('durationDays', dur ? 'command' : 'default')

  // purchase mode
  const mode = parseMode(prompt)
  const purchaseMode = mode ?? profile.purchaseMode
  set('purchaseMode', mode ? 'command' : 'profile')

  const queryName = topics.length ? `${topics.join(' · ')} — ${new Date().toLocaleDateString('he-IL')}` : 'משימת חיפוש'

  return {
    id: uid('task'),
    queryName,
    rawPrompt: prompt.trim(),
    keywords: [...keywords],
    semanticTopics: topics,
    language,
    tlds,
    maxLength,
    maxPrice,
    currency,
    minimumScore,
    statuses: [...statuses],
    durationDays,
    purchaseMode,
    checkFrequency: 'dynamic',
    createdAt: new Date().toISOString(),
    inferred,
  }
}
