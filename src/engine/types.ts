// Core domain model — Domain Opportunity Engine v2.0 ("domains to buy NOW").
// Only domains whose purchase is verified possible right now are surfaced; expiry
// monitoring, Pending Delete, auctions and Backorder are out of scope (spec v2.0 §1, §8).

// The verified purchase path for a result (spec v2.0 §1).
export type PurchaseType =
  | 'register-new' // available for a brand-new registration
  | 'register-dropped' // previously deleted, now available to register
  | 'premium' // premium name, available to register at a premium price
  | 'fixed-price' // registered domain offered Buy-Now (opt-in; delivery not immediate)

export type PurchaseMode = 'manual' | 'auto' // default is manual approval (spec v2.0 §10)

export type RiskSeverity = 'low' | 'medium' | 'high'

// Parsed search task (spec v2.0 §11 data contract: "חיפוש").
export interface SearchTask {
  id: string // query_id
  runId: string // run_id — a TLD/filter change starts a fresh run
  queryName: string
  rawPrompt: string // prompt
  general: boolean
  keywords: string[]
  semanticTopics: string[]
  language: 'English' | 'Hebrew' | 'Any'
  selectedTlds: string[] // selected_tlds — chosen explicitly; empty is NOT "all"
  lengthLimited: boolean
  maxLength: number
  allowNumbers: boolean
  allowHyphens: boolean
  maxTotalPrice: number // max_total_price
  maxRenewalPrice: number // separate renewal-price filter (spec v2.0 §4)
  currency: 'USD' | 'EUR' | 'ILS'
  minimumScore: number
  // which purchase paths are enabled; fixed-price is OFF by default (spec v2.0 §1, §4)
  purchaseModes: PurchaseType[]
  createdAt: string
  inferred: Record<string, 'command' | 'profile' | 'default'>
}

export interface PriceRange {
  low: number
  high: number
  source: string
  date: string
}

export interface RiskFinding {
  type: string
  severity: RiskSeverity
  source: string
  details: string
}

export interface ScoreComponent {
  key: string
  label: string
  weight: number
  raw: number
  checks: string
}

// Verified availability + price (spec v2.0 §11: "אימות" + "מחיר").
export interface Verification {
  availabilityRegistration: boolean
  availabilityFixedSale: boolean
  verifiedAt: string // verified_at
  validUntil: string // valid_until — the ≤5 min status/price window
  provider: string
  responseReference: string // response_reference
}

export interface PriceQuote {
  quoteId: string
  total: number // total purchase price incl. fees/taxes when applicable
  currency: string
  term: number // registration years
  fees: number
  taxStatus: string
  renewalPrice: number // renewal_price (shown separately)
  premium: boolean
  provider: string
  validUntil: string
}

// A scored buy-now opportunity.
export interface Opportunity {
  id: string
  domain: string // domain_ascii
  displayName: string
  baseName: string // base_name (used for "check other TLDs")
  sld: string
  tld: string // suffix
  punycode?: string
  source: string
  purchaseType: PurchaseType
  // purchasable_now is derived server-side only (spec v2.0 §11)
  purchasableNow: boolean
  disabledReason?: string
  deliveryEstimate?: string // delivery_estimate (fixed-price)
  verification: Verification
  // enrichment
  ageYears: number
  backlinks: number
  referringDomains: number
  estTraffic: number
  price: PriceQuote
  sector: string
  priceRange: PriceRange | null
  // scoring
  score: number
  confidence: number // data-completeness index (NOT a sale/profit probability, spec v2.0 §6)
  classification: 'exceptional' | 'good' | 'interesting' | 'weak' | 'blocked'
  components: ScoreComponent[]
  risks: RiskFinding[]
  reason: string
  recommendation: string
  taskId: string
}

// Coverage transparency (spec v2.0 §5, §12).
export interface CoverageReport {
  sourcesChecked: string[]
  sourcesFailed: string[]
  tldsCovered: string[]
  candidates: number
  checked: number
  verifiedForPurchase: number
  updatedAt: string
  partial: boolean
}

// A verification record for the admin check log (spec v2.0 §8 "יומן בדיקות").
export interface CheckLogEntry {
  id: string
  domain: string
  provider: string
  result: 'verified-available' | 'not-available' | 'error' | 'conflict' | 'removed'
  detail: string
  at: string
  reference: string
}

// Order (spec v2.0 §11: "הזמנה").
export interface Order {
  id: string // order_id
  domain: string
  purchaseType: PurchaseType
  provider: string
  amount: number
  currency: string
  // spec v2.0 §8: sent, processing, success, failed, unknown, awaiting-delivery
  status: 'sent' | 'processing' | 'success' | 'failed' | 'unknown' | 'awaiting-delivery'
  budgetReservation: number
  idempotencyKey: string
  at: string
  providerOrderId?: string
}

// A verified quote produced at buy-time (spec v2.0 §9).
export interface PurchaseQuote {
  domain: string
  provider: string
  purchaseType: PurchaseType
  available: boolean
  base: number
  taxes: number
  fees: number
  total: number
  currency: string
  registrationYears: number
  renewalPrice: number
  autoRenew: boolean
  ownerContact: string
  balanceOk: boolean
  verifiable: boolean
  deliveryEstimate?: string
  note: string
}

export interface AlertChannel {
  email: boolean
  whatsapp: boolean
  inapp: boolean
}

export interface AlertEvent {
  id: string
  domain: string
  channel: 'email' | 'whatsapp' | 'inapp'
  title: string
  body: string
  at: string
  read: boolean
}

export interface AuditEvent {
  id: string
  actor: 'system' | 'user'
  action: string
  object: string
  at: string
  detail: string
  requestId: string
}

// A domain owned after a verified purchase (spec v2.0 §8 "הדומיינים שלי").
export interface OwnedDomain {
  domain: string
  registrar: string
  owner: string
  purchasedAt: string
  expiresAt: string
  autoRenew: boolean
  renewalPrice: number
  currency: string
  receiptUrl: string
  emailVerified: boolean
  purchaseType: PurchaseType
}

// A saved search that can be re-run or alert on newly-available opportunities (spec v2.0 §8).
export interface SavedSearch {
  id: string
  name: string
  prompt: string
  tlds: string[]
  maxTotalPrice: number
  createdAt: string
}

export interface SearchProfile {
  name: string
  topics: string[]
  keywords: string[]
  savedTlds: string[]
  maxPrice: number
  maxRenewalPrice: number
  dailyBudget: number
  monthlyBudget: number
  currency: 'USD' | 'EUR' | 'ILS'
  minimumScore: number
  exclusions: string[]
  purchaseMode: PurchaseMode
  allowFixedPrice: boolean
  weights: Record<string, number>
}
