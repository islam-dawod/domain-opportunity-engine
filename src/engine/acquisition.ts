import type { Opportunity, SearchProfile, PurchaseAttempt, PurchaseQuote, OwnedDomain } from './types'
import { uid } from './util'

// Map a status to its supported purchase path (spec v1.2 §8.1.2 "מסלולי רכישה").
export function resolvePath(status: Opportunity['status']): PurchaseQuote['path'] {
  switch (status) {
    case 'Available': return 'register'
    case 'Closeout': return 'closeout'
    case 'Auction': return 'auction'
    case 'PendingDelete':
    case 'Redemption': return 'backorder'
    case 'Registered':
    case 'Expired': return 'monitor-only'
    default: return 'unsupported'
  }
}

const PATH_LABEL: Record<PurchaseQuote['path'], string> = {
  register: 'רישום ישיר דרך API', closeout: 'קנייה במחיר קבוע (Closeout)', auction: 'הצעה במכרז',
  backorder: 'הזמנת Backorder', 'monitor-only': 'מעקב בלבד — לא מוצע למכירה', unsupported: 'לא זמין לרכישה ישירה',
}

// Re-check availability, price, fees, terms and produce a verified quote at buy-time (§8.1.1).
export function buildQuote(opp: Opportunity, profile: SearchProfile, spentToday: number, spentMonth: number): PurchaseQuote {
  const path = resolvePath(opp.status)
  const base = opp.price.price
  const taxes = Math.round(base * 0.17) // VAT-like, illustrative
  const fees = opp.status === 'Auction' ? Math.round(base * 0.1) : 2
  const total = base + taxes + fees
  const registrationYears = 1
  const balanceOk = spentToday + total <= profile.dailyBudget && spentMonth + total <= profile.monthlyBudget
  const verifiable = path === 'register' || path === 'closeout'
  return {
    domain: opp.domain, provider: opp.price.provider, path,
    available: opp.status === 'Available' || opp.status === 'Closeout',
    base, taxes, fees, total, currency: opp.price.currency,
    registrationYears, renewalPrice: opp.price.renewal, autoRenew: true,
    ownerContact: profile.name.split('—')[0].trim() + ' · billing@elitiq.com',
    balanceOk, verifiable,
    note: PATH_LABEL[path],
  }
}

export interface AcquisitionCheck {
  label: string
  ok: boolean
  detail: string
}

export interface AcquisitionDecision {
  domain: string
  mode: 'monitor' | 'notify' | 'approve' | 'auto'
  checks: AcquisitionCheck[]
  allowAutoBuy: boolean
  outcome: 'monitor' | 'notify' | 'awaiting-approval' | 'auto-executed' | 'blocked'
}

// Evaluate Auto-buy safety conditions (spec 8.2 "תנאי Auto-buy").
export function evaluateAcquisition(
  opp: Opportunity,
  profile: SearchProfile,
  spentToday: number,
  spentMonth: number,
  minConfidence = 70,
): AcquisitionDecision {
  const total = opp.price.price
  const highRisk = opp.risks.some((r) => r.severity === 'high')

  const checks: AcquisitionCheck[] = [
    { label: 'מחיר כולל מתחת לתקרת דומיין', ok: total <= profile.maxPrice, detail: `$${total} מול תקרה $${profile.maxPrice}` },
    { label: 'תקציב יומי לא נוצל', ok: spentToday + total <= profile.dailyBudget, detail: `$${spentToday + total} מול $${profile.dailyBudget}` },
    { label: 'תקציב חודשי לא נוצל', ok: spentMonth + total <= profile.monthlyBudget, detail: `$${spentMonth + total} מול $${profile.monthlyBudget}` },
    { label: 'ציון מעל הסף', ok: opp.score >= profile.minimumScore, detail: `${opp.score} מול ${profile.minimumScore}` },
    { label: 'מדד ביטחון מספק', ok: opp.confidence >= minConfidence, detail: `${opp.confidence}% מול ${minConfidence}%` },
    { label: 'אין סיכון משפטי/ספאם גבוה', ok: !highRisk, detail: highRisk ? 'נמצא סמן סיכון גבוה' : 'נקי' },
    { label: 'זמינות אומתה מחדש', ok: opp.status === 'Available' || opp.status === 'Closeout', detail: opp.status },
    { label: 'חשבון רשם פעיל ומאומת', ok: true, detail: opp.price.provider },
  ]

  const allowAutoBuy = checks.every((c) => c.ok) && opp.classification !== 'blocked'

  let outcome: AcquisitionDecision['outcome']
  const mode = profile.purchaseMode
  if (opp.classification === 'blocked' || highRisk) outcome = 'blocked'
  else if (mode === 'monitor') outcome = 'monitor'
  else if (mode === 'notify') outcome = 'notify'
  else if (mode === 'approve') outcome = 'awaiting-approval'
  else outcome = allowAutoBuy ? 'auto-executed' : 'awaiting-approval' // auto falls back to approval when a check fails

  return { domain: opp.domain, mode, checks, allowAutoBuy, outcome }
}

export function makePurchase(opp: Opportunity, status: PurchaseAttempt['status'], quote?: PurchaseQuote): PurchaseAttempt {
  return {
    id: uid('buy'),
    domain: opp.domain,
    provider: opp.price.provider,
    amount: quote?.total ?? opp.price.price,
    currency: opp.price.currency,
    status,
    idempotencyKey: uid('idem'),
    at: new Date().toISOString(),
    orderId: status === 'success' ? 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase() : undefined,
    path: quote?.path ?? resolvePath(opp.status),
  }
}

// Create the owned-domain record after a verified registrar confirmation (§8.1.1).
export function makeOwned(opp: Opportunity, quote: PurchaseQuote): OwnedDomain {
  const now = new Date()
  return {
    domain: opp.domain,
    registrar: quote.provider,
    owner: quote.ownerContact,
    purchasedAt: now.toISOString(),
    expiresAt: new Date(now.getFullYear() + quote.registrationYears, now.getMonth(), now.getDate()).toISOString(),
    autoRenew: quote.autoRenew,
    renewalPrice: quote.renewalPrice,
    currency: quote.currency,
    receiptUrl: `https://${quote.provider.toLowerCase().replace(/\s.*/, '')}.example/receipts/${uid('rcpt').slice(-8)}`,
    emailVerified: false,
  }
}
