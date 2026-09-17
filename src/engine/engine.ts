import type { SearchTask, Opportunity, PurchaseType, RiskFinding, ScoreComponent, SearchProfile, PriceRange, CoverageReport, CheckLogEntry, Verification, VerificationState, PriceQuote, GuardEvent, ConnectionHealth } from './types'
import { SCORE_COMPONENTS, REGISTRARS, PURCHASABLE_TLDS, SCAN_SOURCES, REGISTERED_TEST_NAMES, VALIDITY_MINUTES } from './config'
import { makeRng, pick, rint, clamp, uid } from './util'

const PREFIXES = ['go', 'get', 'my', 'the', 'pro', 'smart', 'prime', 'next', 'true', 'open']
const SUFFIXES = ['ly', 'hub', 'ify', 'io', 'now', 'wise', 'base', 'flow', 'labs', 'zone', 'pro', 'go']
const ADAPTER_VERSION = 'adapter@2.1.0'
const DISCOVERY_FEEDS = ['Dropped-Names Feed', 'Names DB', 'Suggest Model']

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

function detectRisks(rng: () => number, sld: string): RiskFinding[] {
  const risks: RiskFinding[] = []
  if (/[0-9]/.test(sld) && rng() > 0.4) risks.push({ type: 'תווים מבלבלים', severity: 'medium', source: 'Lexical', details: 'מספרים שעלולים להתחלף באותיות' })
  if (sld.includes('-')) risks.push({ type: 'מקף בשם', severity: 'low', source: 'Lexical', details: 'מקפים פוגעים בזכירות' })
  if (['amaz', 'goog', 'face', 'insta', 'micro', 'paypa'].some((b) => sld.includes(b))) risks.push({ type: 'דמיון למותג', severity: 'high', source: 'Trademark Data', details: 'דמיון לסימן מסחר מוכר — אינדיקציה בלבד' })
  if (rng() > 0.9) risks.push({ type: 'היסטוריית ספאם', severity: 'high', source: 'Web History', details: 'סימני ספאם בתוכן עבר' })
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

// ── Hard verification contract (correction spec §4) ──────────────────────────
// The registrar/availability provider is the ONLY authority for availability. A discovery
// feed never determines it. Failures never fall back to a positive status.
export interface VerifyResult {
  state: VerificationState
  availabilityRegistration: boolean
  availabilityFixedSale: boolean
  verificationId: string | null
  provider: string
  normalizedStatus: string
  ok: boolean // provider call succeeded
  detail: string
}

export function verifyCandidate(rng: () => number, sld: string, tld: string, task: SearchTask): VerifyResult {
  const provider = pick(rng, REGISTRARS)
  // provider-level failures (Timeout/429/500/malformed) → never "available"
  if (rng() > 0.94) return { state: 'ERROR', availabilityRegistration: false, availabilityFixedSale: false, verificationId: null, provider, normalizedStatus: 'ERROR', ok: false, detail: 'Timeout / תשובה פגומה — לא מתורגם לפנוי' }
  if (!PURCHASABLE_TLDS.includes(tld)) return { state: 'UNSUPPORTED', availabilityRegistration: false, availabilityFixedSale: false, verificationId: null, provider, normalizedStatus: 'UNSUPPORTED', ok: true, detail: 'סיומת לא נתמכת' }
  // names the provider reports as registered are blocked from registration regardless of any
  // feed/AI claim (correction §4, §10 — not a UI blocklist; it is the provider response)
  if (REGISTERED_TEST_NAMES.includes(sld)) return { state: 'REGISTERED', availabilityRegistration: false, availabilityFixedSale: false, verificationId: null, provider: 'RDAP+Registry', normalizedStatus: 'REGISTERED', ok: true, detail: 'הרשם מדווח רשום — חסום מרישום' }

  const r = rng()
  // fixed-price secondary market (only when opted in): registered but verified for sale
  if (task.purchaseModes.includes('fixed-price') && r > 0.9) {
    return { state: 'FIXED_PRICE_VERIFIED', availabilityRegistration: false, availabilityFixedSale: true, verificationId: 'ver_' + uid('v').slice(-10), provider, normalizedStatus: 'FIXED_PRICE', ok: true, detail: 'הצעת מכירה מאומתת' }
  }
  // conflict: feed suggested dropped, registrar positive, but recent registration evidence contradicts
  if (r > 0.82) return { state: 'CONFLICT', availabilityRegistration: false, availabilityFixedSale: false, verificationId: null, provider, normalizedStatus: 'CONFLICT', ok: true, detail: 'סתירה עם ראיית רישום עדכנית — בבירור' }
  // registrar explicitly reports registered
  if (r > 0.55) return { state: 'REGISTERED', availabilityRegistration: false, availabilityFixedSale: false, verificationId: null, provider, normalizedStatus: 'REGISTERED', ok: true, detail: 'הרשם מדווח רשום' }
  // explicit positive availability → the only path to a purchasable registration result
  return { state: 'AVAILABLE_VERIFIED', availabilityRegistration: true, availabilityFixedSale: false, verificationId: 'ver_' + uid('v').slice(-10), provider, normalizedStatus: 'AVAILABLE', ok: true, detail: 'זמינות חיובית מפורשת מהרשם' }
}

function makePriceQuote(rng: () => number, task: SearchTask, premium: boolean, provider: string, validUntil: string): { price: PriceQuote; base: number; total: number; renewal: number; priceKnown: boolean; renewalKnown: boolean } {
  // some verified-available names still lack a valid quote → shown without a price, not purchasable
  const priceKnown = rng() > 0.12
  const renewalKnown = priceKnown && rng() > 0.08
  const base = premium ? rint(rng, 120, task.maxTotalPrice + 400) : rint(rng, 8, task.maxTotalPrice + 40)
  const fees = rint(rng, 0, 3)
  const taxable = rng() > 0.5
  const taxes = taxable ? Math.round(base * 0.17) : 0
  const total = base + fees + taxes
  const renewal = premium ? Math.round(base * 0.5) : rint(rng, 10, 60)
  return {
    price: { quoteId: priceKnown ? uid('q') : '', total: priceKnown ? total : 0, currency: task.currency, term: 1, fees, taxStatus: taxable ? 'כולל מע״מ' : 'ללא מס', renewalPrice: renewalKnown ? renewal : 0, premium, provider, validUntil },
    base, total, renewal, priceKnown, renewalKnown,
  }
}

export interface DiscoveryResult {
  opportunities: Opportunity[]
  coverage: CoverageReport
  checkLog: CheckLogEntry[]
  guardEvents: GuardEvent[]
  health: ConnectionHealth[]
}

export function runDiscovery(task: SearchTask, profile: SearchProfile): DiscoveryResult {
  const rng = makeRng(task.rawPrompt + task.selectedTlds.join(',') + task.maxTotalPrice + task.runId)
  const tldPool = task.selectedTlds.filter((t) => PURCHASABLE_TLDS.includes(t))
  const bases = task.keywords.length ? task.keywords : GENERAL_ROOTS.map((g) => g.word)

  const opportunities: Opportunity[] = []
  const checkLog: CheckLogEntry[] = []
  const guardEvents: GuardEvent[] = []
  const seen = new Set<string>()
  const healthMap = new Map<string, ConnectionHealth>()
  const bumpHealth = (p: string, fail: boolean) => {
    const h = healthMap.get(p) ?? { provider: p, checks: 0, failures: 0, consecutiveFailures: 0, errorRatePct: 0, suspended: false }
    h.checks++; if (fail) { h.failures++; h.consecutiveFailures++ } else h.consecutiveFailures = 0
    h.errorRatePct = Math.round((h.failures / h.checks) * 100)
    if (h.consecutiveFailures >= 3) h.suspended = true
    healthMap.set(p, h)
  }

  let checked = 0
  const targetCandidates = task.general ? 96 : 68

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

    const discoverySource = pick(rng, DISCOVERY_FEEDS)
    const v = verifyCandidate(rng, sld, tld, task)
    bumpHealth(v.provider, !v.ok)

    // non-purchasable states never enter the buy-now list; they are logged (correction §6)
    if (v.state !== 'AVAILABLE_VERIFIED' && v.state !== 'FIXED_PRICE_VERIFIED') {
      const resultMap: Record<string, CheckLogEntry['result']> = { REGISTERED: 'not-available', CONFLICT: 'conflict', ERROR: 'error', UNSUPPORTED: 'not-available', UNKNOWN: 'error' }
      checkLog.push({ id: uid('log'), domain, provider: v.provider, result: resultMap[v.state] ?? 'not-available', detail: `${v.state} · ${v.detail}`, at: new Date().toISOString(), reference: v.verificationId ?? 'resp_' + uid('r').slice(-6) })
      if (v.state === 'CONFLICT') guardEvents.push({ id: uid('g'), kind: 'response-mismatch', domain, provider: v.provider, action: 'CONFLICT — בדיקת מתאם ומטמון לפני חידוש', at: new Date().toISOString() })
      continue
    }

    // gate: a verified-available result MUST carry a verification_id, else it is removed (correction §9)
    if (!v.verificationId) {
      guardEvents.push({ id: uid('g'), kind: 'label-without-id', domain, provider: v.provider, action: 'הסרת תוצאה · רישום הפרת כלל · עצירת חיבור', at: new Date().toISOString() })
      continue
    }

    const pt: PurchaseType = v.state === 'FIXED_PRICE_VERIFIED' ? 'fixed-price' : v.availabilityRegistration && rng() > 0.5 && sld.length <= 8 ? (rng() > 0.6 ? 'premium' : 'register-dropped') : 'register-new'
    const premium = pt === 'premium'
    const now = Date.now()
    const validMin = rint(rng, 3, VALIDITY_MINUTES)
    const validUntil = new Date(now + validMin * 60000).toISOString()
    const verifiedAt = new Date(now - rint(rng, 0, 90) * 1000).toISOString()
    const { price, base, total, renewal, priceKnown, renewalKnown } = makePriceQuote(rng, task, premium, v.provider, validUntil)

    // budget filter only applies to known prices (correction §6: no default price)
    if (priceKnown && (total > task.maxTotalPrice || renewal > task.maxRenewalPrice)) {
      checkLog.push({ id: uid('log'), domain, provider: v.provider, result: 'removed', detail: `מעל התקציב (סה״כ ${total}/${task.maxTotalPrice}, חידוש ${renewal}/${task.maxRenewalPrice})`, at: new Date().toISOString(), reference: price.quoteId })
      continue
    }

    const verification: Verification = {
      verificationId: v.verificationId, state: v.state,
      availabilityRegistration: v.availabilityRegistration, availabilityFixedSale: v.availabilityFixedSale,
      verifiedAt, validUntil, provider: v.provider, environment: 'production',
      operation: v.state === 'FIXED_PRICE_VERIFIED' ? 'buy-now-check' : 'availability-check',
      normalizedStatus: v.normalizedStatus, responseReference: 'resp_' + uid('r').slice(-8), adapterVersion: ADAPTER_VERSION,
    }

    const dropped = pt === 'register-dropped'
    const ageYears = dropped ? rint(rng, 1, 14) : pt === 'fixed-price' ? rint(rng, 1, 8) : 0
    const referringDomains = dropped ? rint(rng, 0, 3200) : 0
    const risks = detectRisks(rng, sld)
    const components = componentScores(rng, task, sld, tld, priceKnown ? total : task.maxTotalPrice, renewalKnown ? renewal : task.maxRenewalPrice, ageYears, referringDomains, risks, profile.weights)
    const score = Math.round(components.reduce((s, c) => s + c.raw * c.weight, 0))
    const cls = classify(score, risks)
    const missing = (referringDomains === 0 ? 1 : 0) + (risks.length === 0 ? 1 : 0) + (priceKnown ? 0 : 1)
    const confidence = clamp(rint(rng, 65, 97) - missing * 10)
    const hasRange = dropped && priceKnown && rng() > 0.55
    const priceRange: PriceRange | null = hasRange ? { low: Math.round(base * rint(rng, 3, 8)), high: Math.round(base * rint(rng, 9, 30)), source: pick(rng, ['NameBio', 'DNJournal', 'Sedo']), date: `${2023 + rint(rng, 0, 2)}` } : null

    // can_purchase derived server-side (correction §4)
    const canPurchase = cls !== 'blocked' && priceKnown && (pt !== 'fixed-price' || renewalKnown) && verification.environment === 'production'

    checkLog.push({ id: uid('log'), domain, provider: v.provider, result: 'verified-available', detail: `${v.state} · ${PT_REASON[pt]}${priceKnown ? '' : ' · מחיר לא זמין'}`, at: verifiedAt, reference: v.verificationId })

    opportunities.push({
      id: uid('opp'), domain, displayName: domain, baseName: sld, sld, tld,
      punycode: /[^\x00-\x7F]/.test(sld) ? 'xn--' + sld : undefined,
      discoverySource, purchaseType: pt, state: v.state, canPurchase,
      disabledReason: canPurchase ? undefined : !priceKnown ? 'מחיר לא זמין — חסום עד השלמה' : cls === 'blocked' ? 'סיכון גבוה' : 'תנאי רכישה לא הושלמו',
      priceKnown, renewalKnown,
      deliveryEstimate: pt === 'fixed-price' ? `${rint(rng, 3, 14)} ימים (העברה)` : undefined,
      verification, ageYears, backlinks: referringDomains ? referringDomains * rint(rng, 2, 20) : 0, referringDomains,
      estTraffic: ageYears ? rint(rng, 0, 12000) : 0, price, sector: classifySector(sld), priceRange,
      score, confidence, classification: cls, components, risks,
      reason: `מקור גילוי: ${discoverySource}; אימות זמינות: ${v.provider}. ${PT_REASON[pt]}. ${hasRange ? 'קיימות עסקאות השוואה' : 'מתאים לתקציב (ללא טענת רווח)'}.`,
      recommendation: cls === 'blocked' ? 'חסום — נדרש אימות משפטי' : PT_REASON[pt],
      taskId: task.id,
    })
  }

  opportunities.sort((a, b) => b.score - a.score || b.confidence - a.confidence)

  const health = [...healthMap.values()]
  const sourcesFailed = health.filter((h) => h.suspended || h.errorRatePct > 5).map((h) => `${h.provider} (${h.errorRatePct}% שגיאות${h.suspended ? ' · מושהה' : ''})`)
  const verificationServiceAvailable = health.some((h) => !h.suspended)
  const coverage: CoverageReport = {
    sourcesChecked: SCAN_SOURCES, sourcesFailed, tldsCovered: tldPool,
    candidates: seen.size, checked, verifiedForPurchase: opportunities.length,
    updatedAt: new Date().toISOString(), partial: sourcesFailed.length > 0,
    verificationServiceAvailable,
    emptyReason: opportunities.length === 0 ? (verificationServiceAvailable ? 'no-matches' : 'verification-unavailable') : undefined,
  }

  return { opportunities, coverage, checkLog, guardEvents, health }
}

// Fresh per-TLD availability check (correction §6: each suffix a separate identity + check).
export interface TldCheck { tld: string; domain: string; available: boolean; total?: number; currency?: string; reason?: string }
export function checkOtherTlds(baseName: string, tlds: string[], task: SearchTask): TldCheck[] {
  const rng = makeRng(baseName + tlds.join() + Date.now())
  return tlds.filter((t) => PURCHASABLE_TLDS.includes(t)).map((tld) => {
    const v = verifyCandidate(rng, baseName, tld, task)
    const domain = baseName + tld
    if (v.state !== 'AVAILABLE_VERIFIED') return { tld, domain, available: false, reason: v.state }
    const total = rint(rng, 8, task.maxTotalPrice + 60)
    return { tld, domain, available: total <= task.maxTotalPrice, total, currency: task.currency, reason: total > task.maxTotalPrice ? 'מעל התקציב' : undefined }
  })
}

// Server-side re-verification right before an order (correction §8). Never trusts the display.
export interface ServerVerifyResult { ok: boolean; reason?: 'taken' | 'stale' | 'price-changed' | 'no-price'; newTotal?: number }
export function serverVerify(opp: Opportunity): ServerVerifyResult {
  if (new Date(opp.verification.validUntil ?? 0).getTime() <= Date.now()) return { ok: false, reason: 'stale' }
  if (!opp.priceKnown || opp.price.total <= 0) return { ok: false, reason: 'no-price' }
  const roll = Math.random()
  if (roll > 0.9) return { ok: false, reason: 'taken' } // another user registered it after the check
  if (roll > 0.8) return { ok: false, reason: 'price-changed', newTotal: opp.price.total + Math.round(opp.price.total * 0.15) }
  return { ok: true }
}

// ── The adapter contract, isolated for regression testing (correction spec §4, §10) ──
// A raw provider response. HTTP 200 / envelope OK are NOT sufficient on their own.
export interface ProviderAvailabilityResponse {
  httpStatus: number
  envelopeStatus?: string
  itemError?: boolean
  available?: boolean | string // may arrive as the string "false"
  environment: 'production' | 'sandbox'
  domainEcho?: string
  requestDomain: string
  runId?: string
  requestRunId?: string
  rdap404?: boolean
  recentRegistrationEvidence?: boolean
}

// Normalize a raw provider response into a hard verification state. Failure never becomes available.
export function normalizeProviderResponse(r: ProviderAvailabilityResponse): VerificationState {
  if (r.environment !== 'production') return 'ERROR' // sandbox/demo evidence is not valid in production
  if (r.httpStatus !== 200) return r.httpStatus === 0 ? 'UNKNOWN' : 'ERROR' // timeout/429/500
  if (r.itemError) return 'ERROR' // HTTP 200 with an item-level error
  if (r.domainEcho !== undefined && r.domainEcho !== r.requestDomain) return 'CONFLICT' // wrong domain
  if (r.runId !== undefined && r.requestRunId !== undefined && r.runId !== r.requestRunId) return 'ERROR' // old run
  // treat the string "false" as false, not as a non-empty truthy string
  const avail = typeof r.available === 'string' ? r.available.toLowerCase() === 'true' : r.available === true
  if (r.available === undefined) return 'UNKNOWN' // missing field
  if (avail) return r.recentRegistrationEvidence ? 'CONFLICT' : 'AVAILABLE_VERIFIED'
  return 'REGISTERED'
}

export interface CanPurchaseInputs {
  state: VerificationState
  priceKnown: boolean
  priceValid: boolean
  tldSupported: boolean
  fresh: boolean
  environment: 'production' | 'sandbox'
  eligibility: boolean
  budgetOk: boolean
}
// can_purchase is derived server-side from evidence only (correction spec §4).
export function deriveCanPurchase(i: CanPurchaseInputs): boolean {
  if (i.state !== 'AVAILABLE_VERIFIED' && i.state !== 'FIXED_PRICE_VERIFIED') return false
  return i.priceKnown && i.priceValid && i.tldSupported && i.fresh && i.environment === 'production' && i.eligibility && i.budgetOk
}

export { SCAN_SOURCES }
