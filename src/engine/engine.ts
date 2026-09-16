import type { SearchTask, Opportunity, PurchaseType, RiskFinding, ScoreComponent, SearchProfile, PriceRange, CoverageReport, CheckLogEntry, Verification, PriceQuote } from './types'
import { SCORE_COMPONENTS, REGISTRARS, PURCHASABLE_TLDS, SCAN_SOURCES, REGISTERED_TEST_NAMES, VALIDITY_MINUTES } from './config'
import { makeRng, pick, rint, clamp, uid } from './util'

const PREFIXES = ['go', 'get', 'my', 'the', 'pro', 'smart', 'prime', 'next', 'true', 'open']
const SUFFIXES = ['ly', 'hub', 'ify', 'io', 'now', 'wise', 'base', 'flow', 'labs', 'zone', 'pro', 'go']

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
const classifySector = (sld: string) => SECTOR_HINTS.find(([re]) => re.test(sld))?.[1] ?? 'כללי'

function detectRisks(rng: () => number, sld: string, tld: string): RiskFinding[] {
  const risks: RiskFinding[] = []
  if (/[0-9]/.test(sld) && rng() > 0.4) risks.push({ type: 'תווים מבלבלים', severity: 'medium', source: 'Lexical', details: 'מספרים שעלולים להתחלף באותיות' })
  if (sld.includes('-')) risks.push({ type: 'מקף בשם', severity: 'low', source: 'Lexical', details: 'מקפים פוגעים בזכירות' })
  if (['amaz', 'goog', 'face', 'insta', 'micro', 'paypa'].some((b) => sld.includes(b))) risks.push({ type: 'דמיון למותג', severity: 'high', source: 'Trademark Data', details: 'דמיון לסימן מסחר מוכר — אינדיקציה בלבד' })
  if (rng() > 0.9) risks.push({ type: 'היסטוריית ספאם', severity: 'high', source: 'Web History', details: 'סימני ספאם בתוכן עבר' })
  else if (rng() > 0.75) risks.push({ type: 'אינדוקס חלקי', severity: 'low', source: 'SEO', details: 'כיסוי אינדוקס נמוך' })
  return risks
}

function activeComponents(weights: Record<string, number>) {
  const total = SCORE_COMPONENTS.reduce((s, c) => s + (weights[c.key] ?? c.weight), 0)
  return SCORE_COMPONENTS.map((c) => ({ comp: c, w: (weights[c.key] ?? c.weight) / total }))
}

function componentScores(rng: () => number, task: SearchTask, sld: string, tld: string, total: number, renewal: number, ageYears: number, referringDomains: number, risks: RiskFinding[], weights: Record<string, number>): ScoreComponent[] {
  const len = sld.length
  const brandability = clamp(90 - Math.abs(8 - len) * 5 + rint(rng, -8, 8))
  const length = task.lengthLimited ? clamp(len <= task.maxLength ? 100 - (len - 4) * 6 : 40 - (len - task.maxLength) * 8) : clamp(100 - Math.max(0, len - 10) * 6 - (len < 4 ? 20 : 0))
  const tldQuality = tld === '.com' ? rint(rng, 85, 99) : tld === '.io' || tld === '.co' ? rint(rng, 70, 88) : rint(rng, 55, 82)
  const price = clamp(total <= task.maxTotalPrice ? 100 - (total / task.maxTotalPrice) * 30 : 35)
  const renewalScore = clamp(renewal <= task.maxRenewalPrice ? 100 - (renewal / Math.max(task.maxRenewalPrice, 1)) * 30 : 40)
  const age = clamp(Math.min(ageYears, 15) * 6 + rint(rng, 0, 18))
  const links = clamp(Math.log10(referringDomains + 1) * 28 + rint(rng, -5, 12))
  const cleanliness = clamp(100 - risks.filter((r) => r.severity !== 'high').length * 12 - (risks.some((r) => r.type.includes('ספאם')) ? 40 : 0) + rint(rng, -6, 6))
  const legal = clamp(risks.some((r) => r.type.includes('מותג')) ? rint(rng, 5, 30) : rint(rng, 80, 100))
  const raw: Record<string, number> = { brandability, length, tldQuality, price, renewal: renewalScore, age, links, cleanliness, legal }
  return activeComponents(weights).map(({ comp, w }) => ({ ...comp, weight: w, raw: Math.round(raw[comp.key]) }))
}

function classify(score: number, risks: RiskFinding[]): Opportunity['classification'] {
  if (risks.some((r) => r.severity === 'high' && (r.type.includes('מותג') || r.type.includes('ספאם')))) return 'blocked'
  if (score >= 90) return 'exceptional'
  if (score >= 80) return 'good'
  if (score >= 70) return 'interesting'
  return 'weak'
}

const PT_REASON: Record<PurchaseType, string> = {
  'register-new': 'פנוי לרישום מיידי', 'register-dropped': 'נמחק וכעת פנוי לרישום',
  premium: 'Premium פנוי לרישום', 'fixed-price': 'מוצע במחיר קבוע (Buy Now)',
}

// Build a verified enrichment + quote for an available candidate.
function makeVerified(rng: () => number, task: SearchTask, sld: string, tld: string, pt: PurchaseType, source: string) {
  const premium = pt === 'premium'
  const base = premium ? rint(rng, 120, task.maxTotalPrice + 400) : pt === 'fixed-price' ? rint(rng, 60, task.maxTotalPrice + 200) : rint(rng, 8, task.maxTotalPrice + 40)
  const fees = rint(rng, 0, 3)
  const taxable = rng() > 0.5
  const taxes = taxable ? Math.round(base * 0.17) : 0
  const total = base + fees + taxes
  const renewal = premium ? Math.round(base * 0.5) : rint(rng, 10, 60)
  const dropped = pt === 'register-dropped'
  const ageYears = dropped ? rint(rng, 1, 14) : pt === 'fixed-price' ? rint(rng, 1, 8) : 0
  const referringDomains = dropped ? rint(rng, 0, 3200) : 0
  const now = Date.now()
  const validMin = rint(rng, 3, VALIDITY_MINUTES)
  const verification: Verification = {
    availabilityRegistration: pt !== 'fixed-price',
    availabilityFixedSale: pt === 'fixed-price',
    verifiedAt: new Date(now - rint(rng, 0, 120) * 1000).toISOString(),
    validUntil: new Date(now + validMin * 60000).toISOString(),
    provider: source,
    responseReference: 'resp_' + uid('r').slice(-8),
  }
  const price: PriceQuote = {
    quoteId: uid('q'), total, currency: task.currency, term: 1, fees, taxStatus: taxable ? 'כולל מע״מ' : 'ללא מס',
    renewalPrice: renewal, premium, provider: source, validUntil: verification.validUntil,
  }
  return { base, total, renewal, ageYears, referringDomains, verification, price }
}

export interface DiscoveryResult {
  opportunities: Opportunity[]
  coverage: CoverageReport
  checkLog: CheckLogEntry[]
}

export function runDiscovery(task: SearchTask, profile: SearchProfile): DiscoveryResult {
  const rng = makeRng(task.rawPrompt + task.selectedTlds.join(',') + task.maxTotalPrice + task.runId)
  const tldPool = task.selectedTlds.filter((t) => PURCHASABLE_TLDS.includes(t))
  const bases = task.keywords.length ? task.keywords : GENERAL_ROOTS.map((g) => g.word)

  const opportunities: Opportunity[] = []
  const checkLog: CheckLogEntry[] = []
  const seen = new Set<string>()
  let checked = 0
  const targetCandidates = task.general ? 90 : 64

  for (let i = 0; i < targetCandidates && tldPool.length; i++) {
    const root = pick(rng, bases).toLowerCase().replace(/[^a-z]/g, '')
    const style = rng()
    let sld = style < 0.3 ? pick(rng, PREFIXES) + root : style < 0.6 ? root + pick(rng, SUFFIXES) : style < 0.8 ? root : root + rint(rng, 2, 90)
    if (sld.length < 3) continue
    if (!task.allowNumbers) sld = sld.replace(/[0-9]/g, '')
    const tld = pick(rng, tldPool)
    const domain = sld + tld
    if (seen.has(domain)) continue
    seen.add(domain)
    checked++

    // provider verification (spec v2.0 §5): explicit positive response required to be purchasable.
    const registeredTest = REGISTERED_TEST_NAMES.includes(sld)
    const errored = rng() > 0.93
    if (errored) {
      checkLog.push({ id: uid('log'), domain, provider: pick(rng, REGISTRARS), result: 'error', detail: 'Timeout / תשובה ריקה — לא מתורגם לפנוי', at: new Date().toISOString(), reference: 'err_' + uid('e').slice(-6) })
      continue
    }
    if (registeredTest) {
      checkLog.push({ id: uid('log'), domain, provider: 'RDAP', result: 'not-available', detail: 'הספק מדווח רשום — חסום מרישום ללא קשר לטענות אחרות', at: new Date().toISOString(), reference: 'resp_' + uid('r').slice(-6) })
      continue
    }

    // decide purchase type among the enabled paths
    let pt: PurchaseType
    const r = rng()
    if (task.purchaseModes.includes('fixed-price') && r > 0.85) pt = 'fixed-price'
    else if (r > 0.75 && task.purchaseModes.includes('premium')) pt = 'premium'
    else if (r > 0.45 && task.purchaseModes.includes('register-dropped')) pt = 'register-dropped'
    else pt = 'register-new'

    // ~45% of checked candidates are not available now → logged, not shown
    if (rng() > 0.62) {
      checkLog.push({ id: uid('log'), domain, provider: pick(rng, REGISTRARS), result: rng() > 0.85 ? 'conflict' : 'not-available', detail: rng() > 0.85 ? 'סתירה בין מקורות — הוסתר עד בירור' : 'אין תשובת זמינות חיובית', at: new Date().toISOString(), reference: 'resp_' + uid('r').slice(-6) })
      continue
    }

    const source = pick(rng, SCAN_SOURCES)
    const { base, total, renewal, ageYears, referringDomains, verification, price } = makeVerified(rng, task, sld, tld, pt, source)

    // budget filters (spec v2.0 §4): over-cap candidates are checked but not surfaced
    if (total > task.maxTotalPrice || renewal > task.maxRenewalPrice) {
      checkLog.push({ id: uid('log'), domain, provider: source, result: 'removed', detail: `מעל התקציב (סה״כ ${total}/${task.maxTotalPrice}, חידוש ${renewal}/${task.maxRenewalPrice})`, at: new Date().toISOString(), reference: price.quoteId })
      continue
    }

    const risks = detectRisks(rng, sld, tld)
    const components = componentScores(rng, task, sld, tld, total, renewal, ageYears, referringDomains, risks, profile.weights)
    const score = Math.round(components.reduce((s, c) => s + c.raw * c.weight, 0))
    const cls = classify(score, risks)

    const missing = (referringDomains === 0 ? 1 : 0) + (risks.length === 0 ? 1 : 0)
    const confidence = clamp(rint(rng, 65, 97) - missing * 10)

    const hasRange = pt === 'register-dropped' && rng() > 0.55
    const priceRange: PriceRange | null = hasRange ? { low: Math.round(base * rint(rng, 3, 8)), high: Math.round(base * rint(rng, 9, 30)), source: pick(rng, ['NameBio', 'DNJournal', 'Sedo']), date: `${2023 + rint(rng, 0, 2)}` } : null

    const sector = classifySector(sld)
    checkLog.push({ id: uid('log'), domain, provider: source, result: 'verified-available', detail: `${PT_REASON[pt]} · תקף עד ${new Date(verification.validUntil).toLocaleTimeString('he-IL')}`, at: verification.verifiedAt, reference: verification.responseReference })

    opportunities.push({
      id: uid('opp'), domain, displayName: domain, baseName: sld, sld, tld,
      punycode: /[^\x00-\x7F]/.test(sld) ? 'xn--' + sld : undefined,
      source, purchaseType: pt, purchasableNow: true,
      deliveryEstimate: pt === 'fixed-price' ? `${rint(rng, 3, 14)} ימים (העברה)` : undefined,
      verification, ageYears, backlinks: referringDomains ? referringDomains * rint(rng, 2, 20) : 0, referringDomains,
      estTraffic: ageYears ? rint(rng, 0, 12000) : 0, price, sector, priceRange,
      score, confidence, classification: cls, components, risks,
      reason: `${task.general ? `שם בענף ${sector}` : `שם בתחום ${task.semanticTopics[0] ?? sector}`}; ${PT_REASON[pt]}. ${hasRange ? 'קיימות עסקאות השוואה' : 'מתאים לתקציב (ללא טענת רווח)'}.`,
      recommendation: cls === 'blocked' ? 'חסום — נדרש אימות משפטי' : PT_REASON[pt],
      taskId: task.id,
    })
  }

  opportunities.sort((a, b) => b.score - a.score || b.confidence - a.confidence)

  const sourcesFailed = rng() > 0.5 ? ['Dropped-Names Feed (429 Rate limit)'] : []
  const coverage: CoverageReport = {
    sourcesChecked: SCAN_SOURCES, sourcesFailed, tldsCovered: tldPool,
    candidates: seen.size, checked, verifiedForPurchase: opportunities.length,
    updatedAt: new Date().toISOString(), partial: sourcesFailed.length > 0,
  }

  return { opportunities, coverage, checkLog }
}

// Fresh per-TLD availability check for a base name (spec v2.0 §3 "בדוק סיומות אחרות").
// Each TLD is a separate domain: nothing is copied from the original.
export interface TldCheck { tld: string; domain: string; available: boolean; total?: number; currency?: string; reason?: string }
export function checkOtherTlds(baseName: string, tlds: string[], task: SearchTask, _profile: SearchProfile): TldCheck[] {
  const rng = makeRng(baseName + tlds.join() + Date.now())
  return tlds.filter((t) => PURCHASABLE_TLDS.includes(t)).map((tld) => {
    const domain = baseName + tld
    if (REGISTERED_TEST_NAMES.includes(baseName)) return { tld, domain, available: false, reason: 'רשום אצל הספק' }
    const available = rng() > 0.5
    if (!available) return { tld, domain, available: false, reason: 'אין תשובת זמינות חיובית' }
    const total = rint(rng, 8, task.maxTotalPrice + 60)
    return { tld, domain, available: total <= task.maxTotalPrice, total, currency: task.currency, reason: total > task.maxTotalPrice ? 'מעל התקציב' : undefined }
  })
}
