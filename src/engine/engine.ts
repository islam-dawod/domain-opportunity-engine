import type { SearchTask, Opportunity, DomainStatus, RiskFinding, ScoreComponent, SearchProfile } from './types'
import { SCORE_COMPONENTS, CHECK_FREQUENCY, REGISTRARS } from './config'
import { makeRng, pick, rint, clamp, uid } from './util'

const PREFIXES = ['go', 'get', 'my', 'the', 'pro', 'smart', 'prime', 'next', 'true', 'open']
const SUFFIXES = ['ly', 'hub', 'ify', 'io', 'now', 'wise', 'base', 'flow', 'labs', 'zone', 'pro', 'go']
const STATUS_POOL: DomainStatus[] = ['Registered', 'Expired', 'Redemption', 'PendingDelete', 'Auction', 'Closeout', 'Available']

// A confusing-look risk: contains digits that look like letters, or repeated hyphens.
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

function componentScores(
  rng: () => number,
  task: SearchTask,
  sld: string,
  tld: string,
  price: number,
  ageYears: number,
  referringDomains: number,
  risks: RiskFinding[],
  weights: Record<string, number>,
): ScoreComponent[] {
  const len = sld.length
  const relevance = task.keywords.some((k) => sld.includes(k.toLowerCase().slice(0, 4))) ? rint(rng, 75, 98) : rint(rng, 45, 80)
  const brandability = clamp(90 - Math.abs(8 - len) * 5 + rint(rng, -8, 8))
  const length = clamp(len <= task.maxLength ? 100 - (len - 4) * 6 : 40 - (len - task.maxLength) * 8)
  const tldQuality = tld === '.com' ? rint(rng, 85, 99) : tld === '.io' || tld === '.co' ? rint(rng, 70, 88) : rint(rng, 55, 80)
  const priceScore = clamp(price <= task.maxPrice ? 100 - (price / task.maxPrice) * 30 : 35 - (price - task.maxPrice) / 20)
  const age = clamp(Math.min(ageYears, 15) * 6 + rint(rng, 0, 18))
  const links = clamp(Math.log10(referringDomains + 1) * 28 + rint(rng, -5, 12))
  const cleanliness = clamp(100 - risks.filter((r) => r.severity !== 'high').length * 12 - (risks.some((r) => r.type.includes('ספאם')) ? 40 : 0) + rint(rng, -6, 6))
  const legal = clamp(risks.some((r) => r.type.includes('מותג')) ? rint(rng, 5, 30) : rint(rng, 80, 100))

  const raw: Record<string, number> = { relevance, brandability, length, tldQuality, price: priceScore, age, links, cleanliness, legal }
  return SCORE_COMPONENTS.map((c) => ({ ...c, weight: weights[c.key] ?? c.weight, raw: Math.round(raw[c.key]) }))
}

function classify(score: number, risks: RiskFinding[]): Opportunity['classification'] {
  if (risks.some((r) => r.severity === 'high' && (r.type.includes('מותג') || r.type.includes('ספאם')))) return 'blocked'
  if (score >= 90) return 'exceptional'
  if (score >= 80) return 'good'
  if (score >= 70) return 'interesting'
  return 'weak'
}

function buildReason(task: SearchTask, sld: string, status: DomainStatus, score: number): string {
  const topic = task.semanticTopics[0] ?? 'התחום שביקשת'
  const map: Record<DomainStatus, string> = {
    Available: 'פנוי לרישום מיידי',
    PendingDelete: 'בחלון Pending Delete — מתאים ל-Backorder',
    Auction: 'במכרז פעיל',
    Closeout: 'מוצע במחיר Closeout',
    Redemption: 'בתקופת Redemption — הכנה ל-Backorder',
    Expired: 'פג תוקף — במעקב עד שחרור',
    Registered: 'רשום — מעקב לתאריך תפוגה',
  }
  return `שם קצר וזכיר בתחום ${topic}; ${map[status]}. ציון ${score}.`
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
}

// Full pipeline: discovery → dedupe → status verify → enrich → score (spec 3).
export function runDiscovery(task: SearchTask, profile: SearchProfile): DiscoveryResult {
  const rng = makeRng(task.rawPrompt + task.tlds.join(',') + task.maxPrice)
  const roots = new Set<string>()
  const bases = task.keywords.length ? task.keywords : ['global', 'prime', 'nexus']

  // generate candidate SLDs
  for (let i = 0; i < 60; i++) {
    const base = pick(rng, bases).toLowerCase().replace(/[^a-z]/g, '')
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
    const tld = pick(rng, task.tlds)
    // status verification restricted to requested statuses
    let status = pick(rng, task.statuses.length ? task.statuses : STATUS_POOL)
    // available domains are rarer for good short names
    if (status === 'Available' && sld.length <= 6 && rng() > 0.3) status = pick(rng, ['PendingDelete', 'Auction', 'Redemption'])

    const premium = status === 'Available' && sld.length <= 6 && rng() > 0.5
    const base = premium ? rint(rng, 400, 2500) : status === 'Auction' ? rint(rng, 60, 900) : status === 'Closeout' ? rint(rng, 8, 60) : rint(rng, 9, 120)
    const renewal = premium ? Math.round(base * 0.6) : rint(rng, 10, 45)
    const ageYears = status === 'Available' ? 0 : rint(rng, 1, 18)
    const referringDomains = status === 'Available' ? 0 : rint(rng, 0, 4200)

    const risks = detectRisks(rng, sld, tld)
    const components = componentScores(rng, task, sld, tld, base, ageYears, referringDomains, risks, profile.weights)
    const score = Math.round(components.reduce((s, c) => s + c.raw * c.weight, 0))
    const cls = classify(score, risks)
    if (cls === 'blocked') blocked++

    // confidence: driven by data completeness + freshness (spec 7.2)
    const missing = (referringDomains === 0 ? 1 : 0) + (risks.length === 0 ? 1 : 0)
    const confidence = clamp(rint(rng, 60, 96) - missing * 12 - (status === 'Available' ? 0 : rint(rng, 0, 8)))

    const domain = sld + tld
    const punycode = /[^\x00-\x7F]/.test(sld) ? 'xn--' + sld : undefined

    opportunities.push({
      id: uid('opp'),
      domain,
      sld,
      tld,
      punycode,
      status,
      observation: { status, source: pick(rng, ['RDAP', 'Namecheap', 'Dynadot']), checkedAt: new Date(Date.now() - rint(rng, 1, 90) * 60000).toISOString() },
      ageYears,
      backlinks: referringDomains === 0 ? 0 : referringDomains * rint(rng, 2, 20),
      referringDomains,
      estTraffic: status === 'Available' ? 0 : rint(rng, 0, 12000),
      price: { provider: pick(rng, REGISTRARS), price: base, currency: task.currency, renewal, premium },
      score,
      confidence,
      classification: cls,
      components,
      risks,
      reason: buildReason(task, sld, status, score),
      recommendation: recommend(cls, status),
      nextCheck: nextCheckFor(status),
      taskId: task.id,
      watched: false,
      hidden: false,
    })
  }

  // sort by score desc, then confidence
  opportunities.sort((a, b) => b.score - a.score || b.confidence - a.confidence)
  const passed = opportunities.filter((o) => o.score >= task.minimumScore && o.classification !== 'blocked').length

  return {
    opportunities,
    stats: { generated, deduped: roots.size, verified: opportunities.length, passed, blocked },
  }
}

export { CHECK_FREQUENCY }
