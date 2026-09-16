// Core domain model — maps to spec section 12 "מודל נתונים עיקרי".

export type DomainStatus =
  | 'Registered'
  | 'Expired' // Auto-Renew Grace
  | 'Redemption'
  | 'PendingDelete'
  | 'Auction'
  | 'Closeout'
  | 'Available'

export type PurchaseMode = 'monitor' | 'notify' | 'approve' | 'auto'

export type RiskSeverity = 'low' | 'medium' | 'high'

export type Language = 'he' | 'en'

// Parsed, structured search task (spec 6.1 "שדות המשימה").
export interface SearchTask {
  id: string
  queryName: string
  rawPrompt: string
  // general = true means a broad all-domains scan (no topic/keyword/length/language
  // constraints). Topic, language, length and TLD are optional filters only (spec v1.2 §2).
  general: boolean
  keywords: string[]
  semanticTopics: string[]
  language: 'English' | 'Hebrew' | 'Any'
  tlds: string[] // empty = all supported TLDs
  lengthLimited: boolean
  maxLength: number
  maxPrice: number
  currency: 'USD' | 'EUR' | 'ILS'
  minimumScore: number
  statuses: DomainStatus[]
  durationDays: number
  purchaseMode: PurchaseMode
  checkFrequency: 'dynamic' | 'hourly' | 'daily'
  createdAt: string
  // which fields were filled from the free text vs. the default profile
  inferred: Record<string, 'command' | 'profile' | 'default'>
}

// Comparable-sales evidence for an estimated market price (spec v1.2 §7).
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
  weight: number // 0..1
  raw: number // 0..100 normalized
  checks: string
}

export interface PriceQuote {
  provider: string
  price: number
  currency: string
  renewal: number
  premium: boolean
}

export interface DomainObservation {
  status: DomainStatus
  source: string
  checkedAt: string
}

// A scored opportunity — the product's main output object.
export interface Opportunity {
  id: string
  domain: string
  sld: string
  tld: string
  punycode?: string
  status: DomainStatus
  observation: DomainObservation
  // enrichment
  ageYears: number
  backlinks: number
  referringDomains: number
  estTraffic: number
  price: PriceQuote
  // auto-classified sector — for organizing results only, never for filtering (spec v1.2 §7)
  sector: string
  // a never-before-registered "new" name vs. a previously-owned/expired one (spec v1.2 AC-15)
  isNewName: boolean
  // estimated market range from comparable sales, or null when no evidence exists
  priceRange: PriceRange | null
  // scoring
  score: number // 0..100
  confidence: number // 0..100
  classification: 'exceptional' | 'good' | 'interesting' | 'weak' | 'blocked'
  components: ScoreComponent[]
  risks: RiskFinding[]
  reason: string
  recommendation: string
  nextCheck: string
  taskId: string
  watched: boolean
  hidden: boolean
}

// Coverage transparency for a scan (spec v1.2 §2 "הכיסוי").
export interface CoverageReport {
  sourcesChecked: string[]
  tldsCovered: string[]
  candidates: number
  updatedAt: string
  failures: string[]
  partial: boolean
}

export interface WatchItem {
  domain: string
  targetStatus: DomainStatus | 'Available'
  nextCheck: string
  lastChange: string
  rule: string
}

// A verified quote produced at buy-time (spec v1.2 §8.1.1 — re-check before order).
export interface PurchaseQuote {
  domain: string
  provider: string
  path: 'register' | 'closeout' | 'auction' | 'backorder' | 'monitor-only' | 'unsupported'
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
  note: string
}

export interface PurchaseAttempt {
  id: string
  domain: string
  provider: string
  amount: number
  currency: string
  // 'unknown' = registrar timed out; state must be reconciled before any retry (§8.1.3)
  status: 'prepared' | 'awaiting-approval' | 'success' | 'failed' | 'unknown'
  idempotencyKey: string
  at: string
  orderId?: string
  path?: PurchaseQuote['path']
}

// A domain owned after a verified purchase (spec v1.2 §8.1.1 "הדומיינים שלי").
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
}

export type AlertChannel = 'email' | 'whatsapp' | 'inapp'

export interface AlertEvent {
  id: string
  domain: string
  channel: AlertChannel
  title: string
  body: string
  at: string
  read: boolean
}

export type AuditActor = 'system' | 'user'

export interface AuditEvent {
  id: string
  actor: AuditActor
  action: string
  object: string
  at: string
  detail: string
  requestId: string
}

export interface SearchProfile {
  name: string
  topics: string[]
  keywords: string[]
  tlds: string[]
  maxPrice: number
  dailyBudget: number
  monthlyBudget: number
  currency: 'USD' | 'EUR' | 'ILS'
  minimumScore: number
  exclusions: string[]
  purchaseMode: PurchaseMode
  weights: Record<string, number>
}
