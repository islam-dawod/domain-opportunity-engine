import type { SearchTask, Opportunity, DomainStatus, RiskFinding, ScoreComponent, SearchProfile, PriceRange, CoverageReport } from './types'
import { SCORE_COMPONENTS, CHECK_FREQUENCY, REGISTRARS, SUPPORTED_TLDS, SCAN_SOURCES } from './config'
import { makeRng, pick, rint, clamp, uid } from './util'

const PREFIXES = ['go', 'get', 'my', 'the', 'pro', 'smart', 'prime', 'next', 'true', 'open']
const SUFFIXES = ['ly', 'hub', 'ify', 'io', 'now', 'wise', 'base', 'flow', 'labs', 'zone', 'pro', 'go']
const STATUS_POOL: DomainStatus[] = ['Registered', 'Expired', 'Redemption', 'PendingDelete', 'Auction', 'Closeout', 'Available']

// Broad, cross-sector word bank used for a general (all-domains) scan — no topic bias.
const GENERAL_ROOTS: { word: string; sector: string }[] = [
  { word: 'visa', sector: 'הגירה' }, { word: 'migrate', sector: 'הגירה' }, { word: 'relocate', sector: 'הגירה' },
  { word: 'legal', sector: 'משפטים' }, { word: 'counsel', sector: 'משפטים' }, { word: 'rights', sector: 'משפטים' },
  { word: 'estate', sector: 'נדל״ן' }, { word: 'realty', sector: 'נדל״ן' }, { word: 'property', sector: 'נדל״ן' },
  { word: 'cloud', sector: 'טכנולוגיה' }, { word: 'labs', sector: 'טכנולוגיה' }, { word: 'stack', sector: 'טכנולוגיה' },
  { word: 'capital', sector: 'פיננסים' }, { word: 'fund', sector: 'פיננסים' }, { word: 'pay', sector: 'פיננסים' },
  { word: 'health', sector: 'בריאות' }, { word: 'care', sector: 'בריאות' }, { word: 'clinic', sector: 'בריאות' },
  { word: 'learn', sector: 'חינוך' }, { word: 'academy', sector: 'חינוך' }, { word: 'skill', sector: 'חינוך' },
  { word: 'nova', sector: 'כללי' }, { word: 'vertex', sector: 'כללי' }, { word: 'orbit', sector: 'כללי' },
  { word: 'peak', sector: 'כללי' }, { word: 'atlas', sector: 'כללי' }, { word: 'lumen', sector: 'כללי' },
]

const SECTOR_HINTS: [RegExp, string][] = [
  [/visa|migrat|reloc|immig/i, 'הגירה'], [/legal|law|counsel|right/i, 'משפטים'],
  [/estate|realty|propert|home/i, 'נדל״ן'], [/cloud|lab|stack|app|tech|dev|ai/i, 'טכנולוגיה'],
  [/capital|fund|pay|bank|fin/i, 'פיננסים'], [/health|care|clinic|med/i, 'בריאות'],
  [/learn|academy|skill|edu/i, 'חינוך'],
]

function classifySector(sld: string): string {
  for (const [re, s] of SECTOR_HINTS) if (re.test(sld)) return s
  return 'כללי'
}

function detectRisks(rng: () => number, sld: string, tld: string): RiskFinding[] {
  const risks: RiskFinding[] = []
  if (/[0-9]/.test(sld) && rng() > 0.4)
    risks.push({ type: 'תווים מבלבלים', severity: 'medium', source: 'Lexical', details: 'מספרים שעלולים להתחלף באותיות' })
  if (sld.includes('-'))
    risks.push({ type: 'מקף בשם', severity: 'low', source: 'Lexical', details: 'מקפים פוגעים בזכירות' })
  const brandish = ['amaz', 'goog', 'face', 'insta', 'micro', 'paypa']
  if (brandish.some((b) => sld.includes(b)))
    risks.push({ type: 'דמיון למותג', severity: 'high', source: 'Trademark Data', details: 'דמיון לסימן מסחר מוכר — אינדיקציה בלבד' })
  if (rng() > 0.88)
    risks.push({ type: 'היסטוריית ספאם', severity: 'high', source: 'Web History', details: 'סימני ספאם בתוכן עבר' })
  else if (rng() > 0.7)
    risks.push({ type: 'אינדוקס חלקי', severity: 'low', source: 'SEO', details: 'כיסוי אינדוקס נמוך' })
  if (tld !== '.com' && rng() > 0.75)
    risks.push({ type: 'סיומת חריגה', severity: 'low', source: 'Market', details: 'סיומת פחות נפוצה לשוק היעד' })
  return risks
}

// Normalize component weights to sum 1.0 after optionally dropping the relevance
// component (general search does not compute topic relevance — spec v1.2 §7).
function activeComponents(weights: Record<string, number>, general: boolean) {
  const comps = SCORE_COMPONENTS.filter((c) => !(general && c.key === 'relevance'))
  const total = comps.reduce((s, c) => s + (weights[c.key] ?? c.weight), 0)
  return comps.map((c) => ({ comp: c, w: (weights[c.key] ?? c.weight) / total }))
}

function componentScores(
  rng: () => number, task: SearchTask, sld: string, tld: string, price: number,
  ageYears: number, referringDomains: number, risks: RiskFinding[], weights: Record<string, number>,
): ScoreComponent[] {
  const len = sld.length
  const relevance = task.keywords.some((k) => sld.includes(k.toLowerCase().slice(0, 4))) ? rint(rng, 75, 98) : rint(rng, 45, 80)
  const brandability = clamp(90 - Math.abs(8 - len) * 5 + rint(rng, -8, 8))
  // readability curve; a hard max-length penalty applies only when the command set a limit
  const length = task.lengthLimited
    ? clamp(len <= task.maxLength ? 100 - (len - 4) * 6 : 40 - (len - task.maxLength) * 8)
    : clamp(100 - Math.max(0, len - 10) * 6 - (len < 4 ? 20 : 0))
  const tldQuality = tld === '.com' ? rint(rng, 85, 99) : tld === '.io' || tld === '.co' ? rint(rng, 70, 88) : rint(rng, 55, 80)
  const priceScore = clamp(price <= task.maxPrice ? 100 - (price / task.maxPrice) * 30 : 35 - (price - task.maxPrice) / 20)
  const age = clamp(Math.min(ageYears, 15) * 6 + rint(rng, 0, 18))
  const links = clamp(Math.log10(referringDomains + 1) * 28 + rint(rng, -5, 12))
  const cleanliness = clamp(100 - risks.filter((r) => r.severity !== 'high').length * 12 - (risks.some((r) => r.type.includes('ספאם')) ? 40 : 0) + rint(rng, -6, 6))
  const legal = clamp(risks.some((r) => r.type.includes('מותג')) ? rint(rng, 5, 30) : rint(rng, 80, 100))

  const raw: Record<string, number> = { relevance, brandability, length, tldQuality, price: priceScore, age, links, cleanliness, legal }
  return activeComponents(weights, task.general).map(({ comp, w }) => ({ ...comp, weight: w, raw: Math.round(raw[comp.key]) }))
}

function classify(score: number, risks: RiskFinding[]): Opportunity['classification'] {
  if (risks.some((r) => r.severity === 'high' && (r.type.includes('מותג') || r.type.includes('ספאם')))) return 'blocked'
  if (score >= 90) return 'exceptional'
  if (score >= 80) return 'good'
  if (score >= 70) return 'interesting'
  return 'weak'
}

function buildReason(task: SearchTask, sld: string, sector: string, status: DomainStatus, score: number, hasRange: boolean): string {
  const map: Record<DomainStatus, string> = {
    Available: 'פנוי לרישום מיידי', PendingDelete: 'בחלון Pending Delete — מתאים ל-Backorder',
    Auction: 'במכרז פעיל', Closeout: 'מוצע במחיר Closeout', Redemption: 'בתקופת Redemption',
    Expired: 'פג תוקף — במעקב עד שחרור', Registered: 'רשום — מעקב לתאריך תפוגה',
  }
  const ctx = task.general ? `שם זמין בענף ${sector}` : `שם בתחום ${task.semanticTopics[0] ?? sector}`
  const priceNote = hasRange ? 'קיימות עסקאות השוואה' : 'שם מתאים בתקציב (ללא טענת הנחה)'
  return `${ctx}; ${map[status]}. ${priceNote}. ציון ${score}.`
}

function recommend(cls: Opportunity['classification'], status: DomainStatus): string {
  if (cls === 'blocked') return 'לא לרכישה אוטומטית — נדרש אימות משפטי'
  if (status === 'Available') return 'אימות כפול ורישום'
  if (status === 'PendingDelete' || status === 'Redemption') return 'הזמנת Backorder'
  if (status === 'Auction' || status === 'Closeout') return 'הצעה / קנייה לפי תקציב'
  return 'הוספה למעקב'
}

function nextCheckFor(status: DomainStatus): string {
  const minutes: Record<DomainStatus, number> = {
    PendingDelete: 10, Redemption: 180, Available: 5, Auction: 45, Closeout: 60, Expired: 360, Registered: 1440,
  }
  return new Date(Date.now() + minutes[status] * 60000).toISOString()
}

export interface DiscoveryResult {
  opportunities: Opportunity[]
  stats: { generated: number; deduped: number; verified: number; passed: number; blocked: number }
  coverage: CoverageReport
}

export function runDiscovery(task: SearchTask, profile: SearchProfile): DiscoveryResult {
  const rng = makeRng(task.rawPrompt + task.tlds.join(',') + task.maxPrice + (task.general ? 'G' : ''))
  const tldPool = task.tlds.length ? task.tlds : SUPPORTED_TLDS
  const roots = new Set<string>()

  // candidate generation: general scan draws from a broad cross-sector bank;
  // a focused command uses its own keywords.
  const focusedBases = task.keywords.length ? task.keywords : ['global', 'prime', 'nexus']
  const count = task.general ? 84 : 60
  for (let i = 0; i < count; i++) {
    let base: string
    if (task.general) base = pick(rng, GENERAL_ROOTS).word
    else base = pick(rng, focusedBases).toLowerCase().replace(/[^a-z]/g, '')
    const style = rng()
    let sld: string
    if (style < 0.3) sld = pick(rng, PREFIXES) + base
    else if (style < 0.6) sld = base + pick(rng, SUFFIXES)
    else if (style < 0.8) sld = base
    else sld = base + rint(rng, 2, 90)
    if (sld.length >= 3) roots.add(sld)
  }

  const generated = roots.size
  const opportunities: Opportunity[] = []
  let blocked = 0

  for (const sld of roots) {
    const tld = pick(rng, tldPool)
    let status = pick(rng, task.statuses.length ? task.statuses : STATUS_POOL)
    if (status === 'Available' && sld.length <= 6 && rng() > 0.3) status = pick(rng, ['PendingDelete', 'Auction', 'Redemption'])

    const premium = status === 'Available' && sld.length <= 6 && rng() > 0.5
    const base = premium ? rint(rng, 400, 2500) : status === 'Auction' ? rint(rng, 60, 900) : status === 'Closeout' ? rint(rng, 8, 60) : rint(rng, 9, 120)
    const renewal = premium ? Math.round(base * 0.6) : rint(rng, 10, 45)
    // "new" names (never registered) have no age/history; expired ones do (spec v1.2 AC-15)
    const isNewName = status === 'Available' && rng() > 0.5
    const ageYears = isNewName ? 0 : status === 'Available' ? rint(rng, 1, 6) : rint(rng, 1, 18)
    const referringDomains = isNewName ? 0 : rint(rng, 0, 4200)

    const risks = detectRisks(rng, sld, tld)
    const components = componentScores(rng, task, sld, tld, base, ageYears, referringDomains, risks, profile.weights)
    const score = Math.round(components.reduce((s, c) => s + c.raw * c.weight, 0))
    const cls = classify(score, risks)
    if (cls === 'blocked') blocked++

    const missing = (referringDomains === 0 ? 1 : 0) + (risks.length === 0 ? 1 : 0)
    const confidence = clamp(rint(rng, 60, 96) - missing * 12 - (status === 'Available' ? 0 : rint(rng, 0, 8)))

    // comparable-sales range only sometimes exists; otherwise null → no "deal" claim
    const hasRange = !isNewName && rng() > 0.55
    const priceRange: PriceRange | null = hasRange
      ? { low: Math.round(base * rint(rng, 3, 8)), high: Math.round(base * rint(rng, 9, 30)), source: pick(rng, ['NameBio', 'DNJournal', 'Sedo']), date: `${2023 + rint(rng, 0, 2)}` }
      : null

    const sector = classifySector(sld)
    const domain = sld + tld

    opportunities.push({
      id: uid('opp'), domain, sld, tld,
      punycode: /[^\x00-\x7F]/.test(sld) ? 'xn--' + sld : undefined,
      status,
      observation: { status, source: pick(rng, ['RDAP', 'Namecheap', 'Dynadot']), checkedAt: new Date(Date.now() - rint(rng, 1, 90) * 60000).toISOString() },
      ageYears, backlinks: referringDomains === 0 ? 0 : referringDomains * rint(rng, 2, 20), referringDomains,
      estTraffic: isNewName ? 0 : rint(rng, 0, 12000),
      price: { provider: pick(rng, REGISTRARS), price: base, currency: task.currency, renewal, premium },
      sector, isNewName, priceRange,
      score, confidence, classification: cls, components, risks,
      reason: buildReason(task, sld, sector, status, score, hasRange),
      recommendation: recommend(cls, status), nextCheck: nextCheckFor(status),
      taskId: task.id, watched: false, hidden: false,
    })
  }

  opportunities.sort((a, b) => b.score - a.score || b.confidence - a.confidence)
  const passed = opportunities.filter((o) => o.score >= task.minimumScore && o.classification !== 'blocked').length

  // coverage transparency: report sources, covered TLDs, candidate count and any failures.
  const failures: string[] = []
  if (rng() > 0.6) failures.push('Auction Feed — Rate limit (429), חלק מהמכרזים לא נמשכו')
  const coverage: CoverageReport = {
    sourcesChecked: SCAN_SOURCES,
    tldsCovered: tldPool,
    candidates: generated,
    updatedAt: new Date().toISOString(),
    failures,
    partial: failures.length > 0,
  }

  return { opportunities, stats: { generated, deduped: roots.size, verified: opportunities.length, passed, blocked }, coverage }
}

export { CHECK_FREQUENCY }
