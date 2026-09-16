import type { SearchTask, SearchProfile, PurchaseType } from './types'
import { uid } from './util'
import { PURCHASABLE_TLDS } from './config'

const TOPIC_MAP: { match: RegExp; topic: string; keywords: string[] }[] = [
  { match: /(הגיר|ויז[הות]|visa|migrat|immigration|relocat)/i, topic: 'הגירה', keywords: ['visa', 'migrate', 'immigration', 'relocation', 'global'] },
  { match: /(משפט|עורכ[יי] דין|legal|law|attorney|lawyer)/i, topic: 'משפטים', keywords: ['legal', 'law', 'attorney', 'counsel', 'rights'] },
  { match: /(נדל|real ?estate|property|realty)/i, topic: 'נדל״ן', keywords: ['estate', 'property', 'realty', 'homes', 'invest'] },
  { match: /(טכנולוג|tech|software|saas|ai|startup)/i, topic: 'טכנולוגיה', keywords: ['tech', 'app', 'cloud', 'labs', 'ai'] },
  { match: /(פיננס|finance|fintech|bank|invest|כספ)/i, topic: 'פיננסים', keywords: ['finance', 'capital', 'pay', 'fund', 'wealth'] },
  { match: /(בריאות|health|medical|clinic|רפוא)/i, topic: 'בריאות', keywords: ['health', 'care', 'clinic', 'med', 'wellness'] },
  { match: /(חינוך|education|learn|academy|קורס)/i, topic: 'חינוך', keywords: ['learn', 'academy', 'edu', 'school', 'skill'] },
]

const num = (s: string) => parseInt(s.replace(/[,\s]/g, ''), 10)

function parsePrice(text: string): { amount?: number; currency?: 'USD' | 'EUR' | 'ILS' } {
  const dollar = text.match(/\$\s*([\d,]+)/)
  if (dollar) return { amount: num(dollar[1]), currency: 'USD' }
  const withCur = text.match(/([\d,]+)\s*(usd|dollar|דולר|eur|euro|יורו|ils|shekel|שקל|ש"ח|ש״ח)/i)
  if (withCur) {
    const c = withCur[2].toLowerCase()
    const currency = /eur|euro|יורו/.test(c) ? 'EUR' : /ils|shekel|שקל|ש/.test(c) ? 'ILS' : 'USD'
    return { amount: num(withCur[1]), currency }
  }
  const budget = text.match(/(?:עד|תקציב(?:\s+של)?(?:\s+עד)?|budget|up\s+to|max)\s*[:\-]?\s*([\d,]+)/i)
  if (budget) return { amount: num(budget[1]) }
  return {}
}

// TLDs mentioned in the free text (they update the picker visibly — spec v2.0 §3).
function parseTlds(text: string): string[] {
  const found = new Set<string>()
  const re = /(?:^|[^a-z])(?:\.)?(com|net|org|io|co|ai|app|dev|me|tech|xyz|co\.il|co\.uk)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) found.add('.' + m[1].toLowerCase())
  return [...found].filter((t) => PURCHASABLE_TLDS.includes(t))
}

// prompt: free text. selectedTlds: current picker selection. Command TLDs, when present,
// override the picker; otherwise the picker selection is used.
export function interpret(prompt: string, profile: SearchProfile, selectedTlds: string[]): SearchTask {
  const inferred: SearchTask['inferred'] = {}
  const set = (k: string, src: 'command' | 'profile' | 'default') => (inferred[k] = src)

  const explicitGeneral = /בכל התחומים|כל התחומים|all domains|כל הענפים/i.test(prompt)

  const topics: string[] = []
  const keywords = new Set<string>()
  for (const t of TOPIC_MAP) if (t.match.test(prompt)) { topics.push(t.topic); t.keywords.forEach((k) => keywords.add(k)) }
  const hasTopic = topics.length > 0
  set('keywords', hasTopic ? 'command' : 'default')

  let language: SearchTask['language'] = 'Any'
  if (/אנגלית|english/i.test(prompt)) { language = 'English'; set('language', 'command') }
  else if (/עברית|hebrew/i.test(prompt)) { language = 'Hebrew'; set('language', 'command') }
  else set('language', 'default')

  const cmdTlds = parseTlds(prompt)
  const tlds = cmdTlds.length ? cmdTlds : selectedTlds
  set('tlds', cmdTlds.length ? 'command' : selectedTlds.length ? 'profile' : 'default')

  const lenMatch = prompt.match(/(?:עד|up to|max(?:imum)?)\s*(\d{1,2})\s*(?:תווים|characters?|chars?|letters?|אותיות)/i)
  let maxLength = 63, lengthLimited = false
  if (lenMatch) { maxLength = num(lenMatch[1]); lengthLimited = true; set('maxLength', 'command') } else set('maxLength', 'default')

  const price = parsePrice(prompt)
  const maxTotalPrice = price.amount ?? profile.maxPrice
  const currency = price.currency ?? profile.currency
  set('maxTotalPrice', price.amount ? 'command' : 'profile')

  const renewalMatch = prompt.match(/חידוש\s*(?:עד|של)?\s*([\d,]+)|renewal\s*(?:up to|under)?\s*([\d,]+)/i)
  const maxRenewalPrice = renewalMatch ? num(renewalMatch[1] || renewalMatch[2]) : profile.maxRenewalPrice
  set('maxRenewalPrice', renewalMatch ? 'command' : 'profile')

  const scoreMatch = prompt.match(/(?:ציון|score)\s*(\d{2,3})/i)
  const minimumScore = scoreMatch ? num(scoreMatch[1]) : profile.minimumScore
  set('minimumScore', scoreMatch ? 'command' : 'profile')

  // purchase paths: registration types always on; fixed-price only when opted in.
  const wantsFixed = profile.allowFixedPrice || /מכירה במחיר קבוע|buy ?now|fixed ?price/i.test(prompt)
  const purchaseModes: PurchaseType[] = ['register-new', 'register-dropped', 'premium']
  if (wantsFixed) purchaseModes.push('fixed-price')
  set('purchaseModes', wantsFixed ? 'command' : 'default')

  const allowNumbers = !/ללא מספרים|no numbers/i.test(prompt)
  const allowHyphens = !/ללא מקפים|no hyphens/i.test(prompt)

  const general = explicitGeneral || !hasTopic
  const queryName = general
    ? `לקנייה עכשיו — כל התחומים · ${new Date().toLocaleDateString('he-IL')}`
    : `${topics.join(' · ')} — ${new Date().toLocaleDateString('he-IL')}`

  return {
    id: uid('query'),
    runId: uid('run'),
    queryName,
    rawPrompt: prompt.trim() || 'בדוק דומיינים לקנייה עכשיו (כל התחומים לפי הפרופיל)',
    general,
    keywords: [...keywords],
    semanticTopics: topics,
    language,
    selectedTlds: tlds,
    lengthLimited,
    maxLength,
    allowNumbers,
    allowHyphens,
    maxTotalPrice,
    maxRenewalPrice,
    currency,
    minimumScore,
    purchaseModes,
    createdAt: new Date().toISOString(),
    inferred,
  }
}
