import type { SearchProfile, ScoreComponent } from './types'

// Default one-time definition (spec 2.1 "הגדרה חד-פעמית").
export const DEFAULT_PROFILE: SearchProfile = {
  name: 'Elitiq — פרופיל חברה',
  topics: ['הגירה', 'משפטים', 'נדל״ן', 'טכנולוגיה'],
  keywords: ['visa', 'migrate', 'global', 'legal', 'relocation'],
  tlds: ['.com', '.co', '.io'],
  maxPrice: 500,
  dailyBudget: 1500,
  monthlyBudget: 5000,
  currency: 'USD',
  minimumScore: 80,
  exclusions: ['מונחים פוגעניים', 'מותגים מתחרים'],
  purchaseMode: 'approve',
  weights: {
    relevance: 0.2,
    brandability: 0.15,
    length: 0.1,
    tldQuality: 0.1,
    price: 0.1,
    age: 0.1,
    links: 0.1,
    cleanliness: 0.1,
    legal: 0.05,
  },
}

// Scoring components metadata (spec 7).
export const SCORE_COMPONENTS: Omit<ScoreComponent, 'raw'>[] = [
  { key: 'relevance', label: 'התאמה לתחום ולפקודה', weight: 0.2, checks: 'מילות מפתח, משמעות והקשר עסקי' },
  { key: 'brandability', label: 'Brandability', weight: 0.15, checks: 'זכירות, הגייה, איות וייחוד' },
  { key: 'length', label: 'אורך וקריאות', weight: 0.1, checks: 'מספר תווים, מקפים, מספרים ותווים מבלבלים' },
  { key: 'tldQuality', label: 'איכות הסיומת', weight: 0.1, checks: 'התאמה לשוק ולשימוש' },
  { key: 'price', label: 'מחיר מול תקציב', weight: 0.1, checks: 'מחיר רכישה, עמלה וחידוש' },
  { key: 'age', label: 'וותק והיסטוריה', weight: 0.1, checks: 'גיל, עקביות ושימוש קודם' },
  { key: 'links', label: 'קישורים ותנועה', weight: 0.1, checks: 'איכות קישורים ותנועה משוערת' },
  { key: 'cleanliness', label: 'ניקיון טכני ושיווקי', weight: 0.1, checks: 'ספאם, אינדוקס, תוכן עבר' },
  { key: 'legal', label: 'סיכון משפטי', weight: 0.05, checks: 'דמיון לסימני מסחר ומותגים' },
]

// Status → recommended re-check frequency (spec 3.1).
export const CHECK_FREQUENCY: Record<string, { label: string; note: string }> = {
  Registered: { label: 'פעם ביום', note: 'מעקב ארוך טווח' },
  Expired: { label: 'כל 6 שעות', note: 'ייתכן חידוש על ידי הבעלים' },
  Redemption: { label: 'כל 2–4 שעות', note: 'המתנה לשינוי סטטוס' },
  PendingDelete: { label: 'כל 5–15 דקות + Backorder', note: 'חלון קריטי' },
  Available: { label: 'אימות כפול מיידי', note: 'רישום לפי הרשאה' },
  Auction: { label: 'לפי זמן הסיום; מוגבר בשעה האחרונה', note: 'כפוף לכללי ספק המכרז' },
  Closeout: { label: 'כל שעה', note: 'מוצע על ידי רשם או שוק' },
}

export const STATUS_META: Record<string, { he: string; meaning: string; action: string; tone: 'good' | 'warn' | 'bad' | 'muted' }> = {
  Registered: { he: 'רשום ופעיל', meaning: 'רשום ופעיל', action: 'מעקב לפי תאריך תפוגה', tone: 'muted' },
  Expired: { he: 'פג תוקף / Grace', meaning: 'פג תוקף אך בעליו עשוי לחדש', action: 'מעקב; אין הצגה כפנוי', tone: 'warn' },
  Redemption: { he: 'Redemption', meaning: 'הבעלים עשוי לשחזר בתשלום', action: 'מעקב והכנה ל-Backorder', tone: 'warn' },
  PendingDelete: { he: 'Pending Delete', meaning: 'בתהליך מחיקה', action: 'Backorder ובדיקות תכופות', tone: 'bad' },
  Auction: { he: 'מכרז', meaning: 'מוצע על ידי רשם או שוק', action: 'הצעה או קנייה לפי התקציב', tone: 'warn' },
  Closeout: { he: 'Closeout', meaning: 'מוצע במחיר סגירה', action: 'קנייה מהירה לפי התקציב', tone: 'warn' },
  Available: { he: 'פנוי', meaning: 'פנוי לפי API של רשם', action: 'אימות כפול ורישום', tone: 'good' },
}

export const REGISTRARS = ['Namecheap', 'Dynadot']
