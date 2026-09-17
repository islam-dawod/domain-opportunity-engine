import { create } from 'zustand'
import type {
  SearchTask, Opportunity, Order, AlertEvent, AuditEvent, SearchProfile,
  CoverageReport, OwnedDomain, PurchaseQuote, CheckLogEntry, SavedSearch, GuardEvent, ConnectionHealth,
} from '../engine/types'
import { DEFAULT_PROFILE, VALIDITY_MINUTES } from '../engine/config'
import { interpret } from '../engine/interpreter'
import { runDiscovery, serverVerify } from '../engine/engine'
import { evaluateAcquisition, makeOrder, makeOwned, buildQuote } from '../engine/acquisition'
import { uid } from '../engine/util'

export const EXAMPLE_PROMPTS = [
  'מצא הזדמנויות בכל התחומים לקנייה עכשיו, עד 200 דולר.',
  'דומיינים קצרים בתחום המשפטים, ציון 80 ומעלה, עד 150 דולר.',
  'נכסים דיגיטליים בתחום הנדל״ן, עד 120 דולר, חידוש עד 40 דולר.',
  'Find short tech domains available now, under $180, score 75+.',
]

interface Integration { name: string; category: string; connected: boolean; note: string }
interface UserRow { name: string; role: string; twoFA: boolean; perms: string }

interface State {
  profile: SearchProfile
  selectedTlds: string[]
  tasks: SearchTask[]
  currentTask: SearchTask | null
  draftTask: SearchTask | null
  opportunities: Opportunity[]
  coverage: CoverageReport | null
  checkLog: CheckLogEntry[]
  guardEvents: GuardEvent[]
  health: ConnectionHealth[]
  orders: Order[]
  owned: OwnedDomain[]
  savedSearches: SavedSearch[]
  alerts: AlertEvent[]
  audit: AuditEvent[]
  integrations: Integration[]
  users: UserRow[]
  spentToday: number
  spentMonth: number
  running: boolean
  // actions
  setSelectedTlds: (tlds: string[]) => void
  interpretPrompt: (prompt: string) => void
  clearDraft: () => void
  runDraft: () => void
  runBuyNow: (prompt?: string) => void
  updateProfile: (p: Partial<SearchProfile>) => void
  completePurchase: (oppId: string, quote: PurchaseQuote) => void
  reconcile: (orderId: string) => void
  refresh: (oppId: string) => void
  saveSearch: () => void
  markAlertsRead: () => void
}

function logAudit(actor: AuditEvent['actor'], action: string, object: string, detail: string): AuditEvent {
  return { id: uid('aud'), actor, action, object, detail, at: new Date().toISOString(), requestId: uid('req') }
}

export const useStore = create<State>((set, get) => ({
  profile: DEFAULT_PROFILE,
  selectedTlds: [],
  tasks: [],
  currentTask: null,
  draftTask: null,
  opportunities: [],
  coverage: null,
  checkLog: [],
  guardEvents: [],
  health: [],
  orders: [],
  owned: [],
  savedSearches: [],
  alerts: [],
  audit: [logAudit('system', 'אתחול מערכת', 'Domain Opportunity Engine v2.0', 'מצב: לקנייה עכשיו · פרופיל ברירת מחדל')],
  integrations: [
    { name: 'RDAP', category: 'מידע מסייע בלבד', connected: true, note: 'לא קובע זמינות לרכישה' },
    { name: 'Namecheap API', category: 'זמינות ורישום', connected: true, note: 'Credentials מוצפנים · Sandbox' },
    { name: 'Dynadot API', category: 'זמינות ורישום', connected: true, note: 'פיד מורשה · Sandbox' },
    { name: 'Dropped-Names Feed', category: 'מועמדים', connected: true, note: 'מזין מועמדים בלבד' },
    { name: 'Email (SMTP)', category: 'התראות', connected: true, note: 'Templates + מעקב מסירה' },
    { name: 'WhatsApp Business', category: 'התראות', connected: false, note: 'שלב הבא' },
    { name: 'Trademark Data', category: 'סיכון', connected: true, note: 'אינדיקציה בלבד' },
  ],
  users: [
    { name: 'Islam Dawod', role: 'Owner', twoFA: true, perms: 'שליטה מלאה ואישור פעולות רגישות' },
    { name: 'Analyst', role: 'Analyst', twoFA: false, perms: 'יצירת חיפושים ומסננים' },
    { name: 'Buyer', role: 'Buyer', twoFA: true, perms: 'אישור רכישה עד לתקרה' },
    { name: 'Viewer', role: 'Viewer', twoFA: false, perms: 'צפייה בלבד' },
  ],
  spentToday: 0,
  spentMonth: 620,
  running: false,

  setSelectedTlds: (tlds) => set((s) => ({ selectedTlds: tlds, profile: { ...s.profile, savedTlds: tlds } })),

  interpretPrompt: (prompt) => set({ draftTask: interpret(prompt, get().profile, get().selectedTlds) }),

  clearDraft: () => set({ draftTask: null }),

  runBuyNow: (prompt) => {
    // primary "check domains to buy now" action (spec v2.0 §2)
    const task = interpret(prompt ?? '', get().profile, get().selectedTlds)
    set({ draftTask: task })
    get().runDraft()
  },

  runDraft: () => {
    const task = get().draftTask
    if (!task) return
    if (!task.selectedTlds.length) return // empty TLD selection is not "all" (spec v2.0 §3)
    set({ running: true })
    setTimeout(() => {
      const { opportunities, coverage, checkLog, guardEvents, health } = runDiscovery(task, get().profile)

      // alerts only for newly-available high-value opportunities (not a waitlist)
      const alerts: AlertEvent[] = []
      for (const o of opportunities.filter((o) => o.canPurchase && o.score >= task.minimumScore).slice(0, 6)) {
        if (o.score >= 88) alerts.push({ id: uid('alert'), domain: o.domain, channel: 'email', title: 'הזדמנות זמינה עכשיו', body: `${o.domain} · ציון ${o.score} · ${o.recommendation}`, at: new Date().toISOString(), read: false })
      }

      set((s) => ({
        running: false, currentTask: task, draftTask: null,
        tasks: [task, ...s.tasks], opportunities, coverage, checkLog: [...checkLog, ...s.checkLog].slice(0, 400),
        guardEvents: [...guardEvents, ...s.guardEvents].slice(0, 200), health,
        alerts: [...alerts, ...s.alerts],
        audit: [logAudit('user', 'בדיקת דומיינים לקנייה עכשיו', task.queryName, `מועמדים ${coverage.candidates} · נבדקו ${coverage.checked} · אומתו לרכישה ${coverage.verifiedForPurchase}${coverage.partial ? ' · כיסוי חלקי' : ''}`), ...s.audit],
      }))
    }, 900)
  },

  updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p }, audit: [logAudit('user', 'עדכון הגדרות', s.profile.name, JSON.stringify(p)), ...s.audit] })),

  completePurchase: (oppId, quote) => {
    const s = get()
    const opp = s.opportunities.find((o) => o.id === oppId)
    if (!opp) return

    const decision = evaluateAcquisition(opp, s.profile, s.spentToday, s.spentMonth)
    // block on failed safety, stale validity, or insufficient balance (correction §8, §10)
    if (!decision.allow || !quote.available || !quote.balanceOk) {
      set((st) => ({
        orders: [makeOrder(opp, 'failed', quote), ...st.orders],
        alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: 'רכישה נחסמה', body: !quote.balanceOk ? 'יתרה/תקציב לא מספיקים' : !quote.available ? 'נתון פג תוקף — נדרש רענון' : 'בקרת בטיחות נכשלה', at: new Date().toISOString(), read: false }, ...st.alerts],
        audit: [logAudit('system', 'חסימת רכישה', opp.domain, !quote.balanceOk ? 'יתרה/תקציב' : !quote.available ? 'תוקף' : 'בטיחות'), ...st.audit],
      }))
      return
    }

    // server-side live re-verification — the display is never the source of truth (correction §8)
    const sv = serverVerify(opp)
    if (!sv.ok) {
      const takenNow = sv.reason === 'taken'
      set((st) => ({
        // a domain taken after the check flips to REGISTERED and leaves the buy-now list — no false success
        opportunities: st.opportunities.map((o) => o.id === oppId && takenNow ? { ...o, canPurchase: false, state: 'REGISTERED', disabledReason: 'נתפס לאחר הבדיקה' } : o),
        orders: [makeOrder(opp, 'failed', quote), ...st.orders],
        guardEvents: takenNow ? [{ id: uid('g'), kind: 'taken-after-check', domain: opp.domain, provider: quote.provider, action: 'בדיקה לפני רכישה עצרה — אין הצגת הצלחה כוזבת', at: new Date().toISOString() }, ...st.guardEvents] : st.guardEvents,
        alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: sv.reason === 'taken' ? 'נתפס לפני הרישום' : sv.reason === 'price-changed' ? 'המחיר השתנה — נדרש אישור חדש' : 'נדרש רענון אימות', body: sv.reason === 'price-changed' ? `מחיר חדש ${quote.currency} ${sv.newTotal}` : opp.domain, at: new Date().toISOString(), read: false }, ...st.alerts],
        audit: [logAudit('system', 'בדיקת שרת לפני רכישה נכשלה', opp.domain, sv.reason ?? ''), ...st.audit],
      }))
      return
    }

    const roll = Math.random()
    if (roll > 0.92) {
      // registrar timeout → unknown; reconcile before retry (spec v2.0 §10)
      set((st) => ({ orders: [makeOrder(opp, 'unknown', quote), ...st.orders], audit: [logAudit('system', 'Timeout מול הרשם — מצב לא ידוע', opp.domain, 'בדיקת הזמנות ובעלות לפני ניסיון נוסף'), ...st.audit] }))
      return
    }

    // fixed-price completes to awaiting-delivery; registration completes to success (spec v2.0 §9)
    const fixed = opp.purchaseType === 'fixed-price'
    const order = makeOrder(opp, fixed ? 'awaiting-delivery' : 'success', quote)
    const owned = fixed ? [] : [makeOwned(opp, quote)]
    set((st) => ({
      orders: [order, ...st.orders],
      owned: [...owned, ...st.owned],
      spentToday: st.spentToday + quote.total,
      spentMonth: st.spentMonth + quote.total,
      alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: fixed ? 'הזמנה התקבלה — ממתין למסירה' : 'רכישה אומתה', body: `${opp.domain} · ${quote.provider} · הזמנה ${order.id}`, at: new Date().toISOString(), read: false }, ...st.alerts],
      audit: [logAudit('user', fixed ? 'קנייה — ממתין למסירה' : 'רכישה ישירה אומתה', opp.domain, `${quote.provider} · ${quote.currency} ${quote.total} · ${quote.note} · order:${order.id}`), ...st.audit],
    }))
  },

  reconcile: (orderId) => set((s) => {
    const order = s.orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'unknown') return s
    const opp = s.opportunities.find((o) => o.domain === order.domain)
    const found = Math.random() > 0.5
    const orders = s.orders.map((o) => (o.id === orderId ? { ...o, status: (found ? 'success' : 'failed') as Order['status'], providerOrderId: found ? 'P-' + Math.random().toString(36).slice(2, 7).toUpperCase() : undefined } : o))
    const owned = found && opp ? [makeOwned(opp, buildQuote(opp, s.profile, s.spentToday, s.spentMonth)), ...s.owned] : s.owned
    return {
      orders, owned,
      spentToday: found ? s.spentToday + order.amount : s.spentToday,
      spentMonth: found ? s.spentMonth + order.amount : s.spentMonth,
      audit: [logAudit('system', 'בירור הזמנה תלויה', order.domain, found ? 'נמצאה בעלות — הושלמה' : 'לא נמצאה — התקציב שוחרר'), ...s.audit],
    }
  }),

  // Re-verify a result whose validity window expired (spec v2.0 §5).
  refresh: (oppId) => set((s) => ({
    opportunities: s.opportunities.map((o) => o.id === oppId ? { ...o, verification: { ...o.verification, verifiedAt: new Date().toISOString(), validUntil: new Date(Date.now() + VALIDITY_MINUTES * 60000).toISOString() } } : o),
    audit: [logAudit('system', 'רענון אימות', s.opportunities.find((o) => o.id === oppId)?.domain ?? '', 'בדיקה חדשה בצד השרת'), ...s.audit],
  })),

  saveSearch: () => set((s) => {
    if (!s.currentTask) return s
    const t = s.currentTask
    return { savedSearches: [{ id: uid('saved'), name: t.queryName, prompt: t.rawPrompt, tlds: t.selectedTlds, maxTotalPrice: t.maxTotalPrice, createdAt: new Date().toISOString() }, ...s.savedSearches], audit: [logAudit('user', 'שמירת חיפוש', t.queryName, ''), ...s.audit] }
  }),

  markAlertsRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
}))
