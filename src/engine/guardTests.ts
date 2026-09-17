import { normalizeProviderResponse, deriveCanPurchase, type ProviderAvailabilityResponse } from './engine'
import type { VerificationState } from './types'

export interface GuardTest {
  id: string
  scenario: string
  expected: string
  actual: string
  pass: boolean
  blocksDeploy: boolean // a failing "block" test prevents deployment (correction §10)
}

const base = (over: Partial<ProviderAvailabilityResponse>): ProviderAvailabilityResponse => ({
  httpStatus: 200, environment: 'production', requestDomain: 'x.com', available: false, ...over,
})

// Mandatory regression scenarios from the correction spec §10. Each asserts the hard contract.
export function runGuardTests(): GuardTest[] {
  const t: GuardTest[] = []
  const add = (scenario: string, expected: string, actual: string, blocksDeploy = true) =>
    t.push({ id: 'GT-' + (t.length + 1), scenario, expected, actual, pass: expected === actual, blocksDeploy })

  // 1. nova.com / visa.com returned as registered → not available (works for any name)
  add('nova.com בתגובת ספק = רשום', 'REGISTERED', normalizeProviderResponse(base({ requestDomain: 'nova.com', available: false })))
  add('שם אקראי כלשהו = רשום (לא רשימת חסימה)', 'REGISTERED', normalizeProviderResponse(base({ requestDomain: 'randomxyz.com', available: false })))

  // 2. available="false" as string; HTTP 200 with item error
  add('available="false" כמחרוזת', 'REGISTERED', normalizeProviderResponse(base({ available: 'false' })))
  add('HTTP 200 עם שגיאת פריט', 'ERROR', normalizeProviderResponse(base({ available: true, itemError: true })))

  // 3. Timeout / 429 / 500 / malformed / missing field
  add('Timeout (ללא תשובה)', 'UNKNOWN', normalizeProviderResponse(base({ httpStatus: 0, available: undefined })))
  add('HTTP 429', 'ERROR', normalizeProviderResponse(base({ httpStatus: 429, available: undefined })))
  add('HTTP 500', 'ERROR', normalizeProviderResponse(base({ httpStatus: 500, available: undefined })))
  add('שדה זמינות חסר', 'UNKNOWN', normalizeProviderResponse(base({ available: undefined })))

  // 4. RDAP 404 alone is not an availability conclusion
  add('RDAP 404 בלבד (ללא תשובת רשם)', 'UNKNOWN', normalizeProviderResponse(base({ available: undefined, rdap404: true })))

  // 5. Feed says dropped but registrar returns taken → taken wins
  add('פיד: נמחק · רשם: תפוס', 'REGISTERED', normalizeProviderResponse(base({ available: false })))

  // 6. Registrar available but recent registration evidence contradicts → CONFLICT
  add('רשם: פנוי · ראיית רישום סותרת', 'CONFLICT', normalizeProviderResponse(base({ available: true, recentRegistrationEvidence: true })))

  // 9. Response for another domain / old run is rejected
  add('תשובה לדומיין אחר', 'CONFLICT', normalizeProviderResponse(base({ requestDomain: 'a.com', domainEcho: 'b.com', available: true })))
  add('תשובה מריצה ישנה', 'ERROR', normalizeProviderResponse(base({ available: true, runId: 'run_9', requestRunId: 'run_10' })))

  // 10. Sandbox / demo data in production is blocked
  add('נתוני Sandbox בייצור', 'ERROR', normalizeProviderResponse(base({ available: true, environment: 'sandbox' })))

  // 16. A genuinely available domain reaches AVAILABLE_VERIFIED
  add('דומיין פנוי תקין', 'AVAILABLE_VERIFIED', normalizeProviderResponse(base({ requestDomain: 'freshname.com', available: true })))

  // ── can_purchase derivation (correction §4) ──
  const ok = { priceKnown: true, priceValid: true, tldSupported: true, fresh: true, environment: 'production' as const, eligibility: true, budgetOk: true }
  const yn = (b: boolean) => (b ? 'can_purchase' : 'blocked')
  add('7. אימות פג תוקף → חסום', 'blocked', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok, fresh: false })))
  add('11. זמינות חיובית אך מחיר חסר → חסום', 'blocked', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok, priceKnown: false })))
  add('11. מחיר לא בתוקף → חסום', 'blocked', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok, priceValid: false })))
  add('12. סיומת לא נתמכת → חסום', 'blocked', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok, tldSupported: false })))
  add('AVAILABLE_VERIFIED + כל התנאים → מותר', 'can_purchase', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok })))
  add('REGISTERED לעולם אינו can_purchase', 'blocked', yn(deriveCanPurchase({ state: 'REGISTERED' as VerificationState, ...ok })))
  add('CONFLICT לעולם אינו can_purchase', 'blocked', yn(deriveCanPurchase({ state: 'CONFLICT' as VerificationState, ...ok })))
  add('15. תקציב חסר → חסום', 'blocked', yn(deriveCanPurchase({ state: 'AVAILABLE_VERIFIED', ...ok, budgetOk: false })))
  add('FIXED_PRICE_VERIFIED + תנאים → מותר', 'can_purchase', yn(deriveCanPurchase({ state: 'FIXED_PRICE_VERIFIED', ...ok })))

  return t
}
