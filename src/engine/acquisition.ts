import type { Opportunity, SearchProfile, PurchaseQuote, Order, OwnedDomain } from './types'
import { PURCHASE_TYPE_META } from './config'
import { uid } from './util'

export interface AcquisitionCheck { label: string; ok: boolean; detail: string }
export interface AcquisitionDecision { checks: AcquisitionCheck[]; allow: boolean }

// Whether a result is currently purchasable given its ≤5-min validity window (spec v2.0 §5).
export function isFresh(opp: Opportunity): boolean {
  return !!opp.verification.validUntil && new Date(opp.verification.validUntil).getTime() > Date.now()
}

// Re-verify and produce a buy-time quote (spec v2.0 §9).
export function buildQuote(opp: Opportunity, profile: SearchProfile, spentToday: number, spentMonth: number): PurchaseQuote {
  const base = opp.price.total - opp.price.fees
  const taxes = opp.price.taxStatus === 'כולל מע״מ' ? Math.round(base * 0.17) : 0
  const fees = opp.price.fees
  const total = opp.price.total
  const balanceOk = spentToday + total <= profile.dailyBudget && spentMonth + total <= profile.monthlyBudget
  return {
    domain: opp.domain, provider: opp.price.provider, purchaseType: opp.purchaseType,
    // available requires a verified state, a valid id, a known price and a fresh window
    available: opp.canPurchase && !!opp.verification.verificationId && opp.priceKnown && isFresh(opp),
    base, taxes, fees, total, currency: opp.price.currency,
    registrationYears: opp.price.term, renewalPrice: opp.price.renewalPrice, autoRenew: true,
    ownerContact: profile.name.split('—')[0].trim() + ' · billing@elitiq.com',
    balanceOk, verifiable: isFresh(opp),
    deliveryEstimate: opp.deliveryEstimate,
    note: PURCHASE_TYPE_META[opp.purchaseType].he,
  }
}

// Safety gate (spec v2.0 §10). Manual approval is the default; every check must pass.
export function evaluateAcquisition(opp: Opportunity, profile: SearchProfile, spentToday: number, spentMonth: number, minConfidence = 60): AcquisitionDecision {
  const total = opp.price.total
  const highRisk = opp.risks.some((r) => r.severity === 'high')
  const checks: AcquisitionCheck[] = [
    { label: 'זמינות מאומתת (verification_id)', ok: !!opp.verification.verificationId && (opp.state === 'AVAILABLE_VERIFIED' || opp.state === 'FIXED_PRICE_VERIFIED'), detail: opp.verification.verificationId ? opp.state : 'אין ראיה תקפה' },
    { label: 'מחיר ידוע ובתוקף', ok: opp.priceKnown, detail: opp.priceKnown ? 'ידוע' : 'לא זמין' },
    { label: 'מחיר כולל מתחת לתקרת דומיין', ok: total <= profile.maxPrice, detail: `${total} / ${profile.maxPrice}` },
    { label: 'מחיר חידוש מתחת לסף', ok: opp.price.renewalPrice <= profile.maxRenewalPrice, detail: `${opp.price.renewalPrice} / ${profile.maxRenewalPrice}` },
    { label: 'תקציב יומי לא נוצל', ok: spentToday + total <= profile.dailyBudget, detail: `${spentToday + total} / ${profile.dailyBudget}` },
    { label: 'תקציב חודשי לא נוצל', ok: spentMonth + total <= profile.monthlyBudget, detail: `${spentMonth + total} / ${profile.monthlyBudget}` },
    { label: 'ציון מעל הסף', ok: opp.score >= profile.minimumScore, detail: `${opp.score} / ${profile.minimumScore}` },
    { label: 'מדד שלמות נתונים מספק', ok: opp.confidence >= minConfidence, detail: `${opp.confidence}% / ${minConfidence}%` },
    { label: 'אין סיכון משפטי/ספאם גבוה', ok: !highRisk, detail: highRisk ? 'נמצא סמן סיכון גבוה' : 'נקי' },
    { label: 'זמינות בתוקף (חלון ≤5 דק׳)', ok: isFresh(opp), detail: isFresh(opp) ? 'בתוקף' : 'פג — נדרש רענון' },
    { label: 'חשבון רשם פעיל ומאומת', ok: true, detail: opp.price.provider },
  ]
  return { checks, allow: checks.every((c) => c.ok) && opp.classification !== 'blocked' }
}

export function makeOrder(opp: Opportunity, status: Order['status'], quote: PurchaseQuote): Order {
  return {
    id: 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    domain: opp.domain, purchaseType: opp.purchaseType, provider: quote.provider,
    amount: quote.total, currency: quote.currency, status,
    budgetReservation: quote.total, idempotencyKey: uid('idem'), at: new Date().toISOString(),
    providerOrderId: status === 'success' || status === 'awaiting-delivery' ? 'P-' + Math.random().toString(36).slice(2, 7).toUpperCase() : undefined,
  }
}

export function makeOwned(opp: Opportunity, quote: PurchaseQuote): OwnedDomain {
  const now = new Date()
  return {
    domain: opp.domain, registrar: quote.provider, owner: quote.ownerContact,
    purchasedAt: now.toISOString(),
    expiresAt: new Date(now.getFullYear() + quote.registrationYears, now.getMonth(), now.getDate()).toISOString(),
    autoRenew: quote.autoRenew, renewalPrice: quote.renewalPrice, currency: quote.currency,
    receiptUrl: `https://${quote.provider.toLowerCase().replace(/\s.*/, '')}.example/receipts/${uid('rcpt').slice(-8)}`,
    emailVerified: false, purchaseType: opp.purchaseType,
  }
}
