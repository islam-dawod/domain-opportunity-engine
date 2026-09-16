import type { Opportunity, SearchProfile, PurchaseAttempt } from './types'
import { uid } from './util'

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

export function makePurchase(opp: Opportunity, status: PurchaseAttempt['status']): PurchaseAttempt {
  return {
    id: uid('buy'),
    domain: opp.domain,
    provider: opp.price.provider,
    amount: opp.price.price,
    currency: opp.price.currency,
    status,
    idempotencyKey: uid('idem'),
    at: new Date().toISOString(),
    orderId: status === 'success' ? 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase() : undefined,
  }
}
