import type { SearchProfile, ScoreComponent, PurchaseType } from './types'

// One-time setup profile (spec v2.0 §2). Business sector is NOT required.
export const DEFAULT_PROFILE: SearchProfile = {
  name: 'Elitiq — פרופיל חברה',
  topics: [],
  keywords: [],
  savedTlds: [], // no silent TLD default on first visit (spec v2.0 §3)
  maxPrice: 200,
  maxRenewalPrice: 60,
  dailyBudget: 1500,
  monthlyBudget: 5000,
  currency: 'USD',
  minimumScore: 70,
  exclusions: ['מונחים פוגעניים', 'מותגים מתחרים'],
  purchaseMode: 'manual', // manual approval by default (spec v2.0 §10)
  allowFixedPrice: false, // fixed-price sale path OFF by default (spec v2.0 §1, §4)
  weights: {
    brandability: 0.22,
    length: 0.16,
    tldQuality: 0.16,
    price: 0.16,
    renewal: 0.12,
    age: 0.06,
    links: 0.06,
    cleanliness: 0.04,
    legal: 0.02,
  },
}

// Scoring components (spec v2.0 §6) — memorability, readability, use-fit, TLD, total price,
// renewal cost. No sector-relevance weight in a general search.
export const SCORE_COMPONENTS: Omit<ScoreComponent, 'raw'>[] = [
  { key: 'brandability', label: 'זכירות והתאמה לשימוש', weight: 0.22, checks: 'זכירות, הגייה, ייחוד והתאמה לשימוש' },
  { key: 'length', label: 'אורך וקריאות', weight: 0.16, checks: 'מספר תווים, מקפים, מספרים ותווים מבלבלים' },
  { key: 'tldQuality', label: 'איכות הסיומת', weight: 0.16, checks: 'התאמה לשוק ולשימוש' },
  { key: 'price', label: 'מחיר כולל מול תקציב', weight: 0.16, checks: 'מחיר רכישה, עמלות ומסים' },
  { key: 'renewal', label: 'עלות חידוש', weight: 0.12, checks: 'מחיר חידוש שנתי' },
  { key: 'age', label: 'וותק והיסטוריה', weight: 0.06, checks: 'גיל ושימוש קודם (כשקיים)' },
  { key: 'links', label: 'קישורים ותנועה', weight: 0.06, checks: 'איכות קישורים ותנועה (כשקיים)' },
  { key: 'cleanliness', label: 'ניקיון טכני ושיווקי', weight: 0.04, checks: 'ספאם, אינדוקס, תוכן עבר' },
  { key: 'legal', label: 'סיכון משפטי', weight: 0.02, checks: 'דמיון לסימני מסחר ומותגים' },
]

// Purchase-type presentation (spec v2.0 §1).
export const PURCHASE_TYPE_META: Record<PurchaseType, { he: string; desc: string; tone: 'good' | 'warn' | 'muted'; buy: string }> = {
  'register-new': { he: 'פנוי לרישום', desc: 'זמינות מאומתת + הצעת מחיר עדכנית', tone: 'good', buy: 'רשום עכשיו' },
  'register-dropped': { he: 'נמחק — פנוי כעת', desc: 'זמין לרישום; היסטוריית תפוגה אינה מספיקה', tone: 'good', buy: 'רשום עכשיו' },
  premium: { he: 'Premium פנוי', desc: 'זמינות מאומתת ומחיר Premium ידוע', tone: 'warn', buy: 'רשום Premium' },
  'fixed-price': { he: 'מכירה במחיר קבוע', desc: 'הצעת Buy Now מאומתת; מסירה אינה מיידית', tone: 'warn', buy: 'קנה עכשיו' },
}

// Supported TLDs with an active check+purchase connection (spec v2.0 §3).
// Country-code TLDs may carry eligibility requirements.
export interface TldInfo { tld: string; country?: boolean; eligibility?: string; supported: boolean }
export const SUPPORTED_TLDS: TldInfo[] = [
  { tld: '.com', supported: true }, { tld: '.net', supported: true }, { tld: '.org', supported: true },
  { tld: '.io', supported: true }, { tld: '.co', supported: true }, { tld: '.ai', supported: true },
  { tld: '.app', supported: true }, { tld: '.dev', supported: true }, { tld: '.me', supported: true },
  { tld: '.tech', supported: true }, { tld: '.xyz', supported: true },
  { tld: '.co.il', country: true, eligibility: 'דרוש עוסק/ח.פ. ישראלי או זיקה', supported: true },
  { tld: '.co.uk', country: true, eligibility: 'כתובת בריטית לרישום', supported: true },
  { tld: '.law', eligibility: 'אימות רישיון עריכת דין', supported: false }, // not purchasable → not selectable
]

export const TLD_LIST = SUPPORTED_TLDS.map((t) => t.tld)
export const PURCHASABLE_TLDS = SUPPORTED_TLDS.filter((t) => t.supported).map((t) => t.tld)

export const SCAN_SOURCES = ['RDAP', 'Namecheap Availability', 'Dynadot API', 'Dropped-Names Feed']
export const SECTORS = ['הגירה', 'משפטים', 'נדל״ן', 'טכנולוגיה', 'פיננסים', 'בריאות', 'חינוך', 'כללי']
export const REGISTRARS = ['Namecheap', 'Dynadot']

// Test registry: names the provider reports as already registered are blocked from
// registration regardless of any other claim (spec v2.0 AC-6).
export const REGISTERED_TEST_NAMES = ['visa', 'google', 'amazon', 'apple', 'microsoft', 'paypal']

// Status/price validity window (spec v2.0 §5). Proposed product target, not a provider guarantee.
export const VALIDITY_MINUTES = 5
