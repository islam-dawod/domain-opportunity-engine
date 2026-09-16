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
  keywords: string[]
  semanticTopics: string[]
  language: 'English' | 'Hebrew' | 'Any'
  tlds: string[]
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

export interface WatchItem {
  domain: string
  targetStatus: DomainStatus | 'Available'
  nextCheck: string
  lastChange: string
  rule: string
}

export interface PurchaseAttempt {
  id: string
  domain: string
  provider: string
  amount: number
  currency: string
  status: 'prepared' | 'awaiting-approval' | 'success' | 'failed'
  idempotencyKey: string
  at: string
  orderId?: string
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
