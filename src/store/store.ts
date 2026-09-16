import { create } from 'zustand'
import type {
  SearchTask, Opportunity, WatchItem, PurchaseAttempt, AlertEvent, AuditEvent, SearchProfile,
  CoverageReport, OwnedDomain, PurchaseQuote,
} from '../engine/types'
import { DEFAULT_PROFILE } from '../engine/config'
import { interpret, generalTask } from '../engine/interpreter'
import { runDiscovery } from '../engine/engine'
import { evaluateAcquisition, makePurchase, makeOwned, buildQuote } from '../engine/acquisition'
import { uid } from '../engine/util'

export const EXAMPLE_PROMPTS = [
  'מצא לי במשך 14 יום דומיינים בהזדמנות בכל התחומים ובכל הסיומות הנתמכות, בתקציב של עד 750 דולר. תציג רק תוצאות בציון 80 ומעלה ותתריע מיד על דומיין שעובר למצב Pending Delete או הופך לפנוי.',
  'מצא דומיינים קצרים בתחום המשפטים באנגלית, רק com ו-co, עד 500 דולר, ציון 85 ומעלה, מצב אישור.',
  'חפש נכסי נדל״ן דיגיטליים: דומיינים בתחום הנדל״ן, io ו-com, עד 300 דולר, במשך שבועיים.',
  'Find short tech domains, .com and .io, up to $600, score 80+, notify on auction.',
]

interface Integration { name: string; category: string; connected: boolean; note: string }
interface UserRow { name: string; role: string; twoFA: boolean; perms: string }

interface State {
  profile: SearchProfile
  tasks: SearchTask[]
  currentTask: SearchTask | null
  draftTask: SearchTask | null
  opportunities: Opportunity[]
  stats: { generated: number; deduped: number; verified: number; passed: number; blocked: number } | null
  coverage: CoverageReport | null
  watchlist: WatchItem[]
  purchases: PurchaseAttempt[]
  owned: OwnedDomain[]
  alerts: AlertEvent[]
  audit: AuditEvent[]
  integrations: Integration[]
  users: UserRow[]
  spentToday: number
  spentMonth: number
  running: boolean
  // actions
  interpretPrompt: (prompt: string) => void
  clearDraft: () => void
  runDraft: () => void
  runGeneral: () => void
  updateProfile: (p: Partial<SearchProfile>) => void
  toggleWatch: (id: string) => void
  toggleHide: (id: string) => void
  completePurchase: (oppId: string, quote: PurchaseQuote) => void
  approve: (id: string) => void
  reconcile: (id: string) => void
  markAlertsRead: () => void
}

function logAudit(actor: AuditEvent['actor'], action: string, object: string, detail: string): AuditEvent {
  return { id: uid('aud'), actor, action, object, detail, at: new Date().toISOString(), requestId: uid('req') }
}

export const useStore = create<State>((set, get) => ({
  profile: DEFAULT_PROFILE,
  tasks: [],
  currentTask: null,
  draftTask: null,
  opportunities: [],
  stats: null,
  coverage: null,
  watchlist: [],
  purchases: [],
  owned: [],
  alerts: [],
  audit: [logAudit('system', 'אתחול מערכת', 'Domain Opportunity Engine', 'פרופיל ברירת מחדל נטען')],
  integrations: [
    { name: 'RDAP', category: 'סטטוס ונתוני רישום', connected: true, note: 'Cache + Rate limit' },
    { name: 'Namecheap API', category: 'זמינות ורישום', connected: true, note: 'Credentials מוצפנים' },
    { name: 'Dynadot API', category: 'Expired / Closeout', connected: true, note: 'פיד מורשה' },
    { name: 'Email (SMTP)', category: 'התראות', connected: true, note: 'Templates + מעקב מסירה' },
    { name: 'WhatsApp Business', category: 'התראות', connected: false, note: 'שלב 2' },
    { name: 'SEO / Backlinks', category: 'העשרה', connected: false, note: 'אופציונלי' },
    { name: 'Trademark Data', category: 'סיכון', connected: true, note: 'אינדיקציה בלבד' },
  ],
  users: [
    { name: 'Islam Dawod', role: 'Owner', twoFA: true, perms: 'שליטה מלאה ואישור פעולות רגישות' },
    { name: 'Analyst', role: 'Analyst', twoFA: false, perms: 'יצירת משימות, מסננים וייצוא' },
    { name: 'Buyer', role: 'Buyer', twoFA: true, perms: 'אישור רכישה עד לתקרה' },
    { name: 'Viewer', role: 'Viewer', twoFA: false, perms: 'צפייה בלבד' },
  ],
  spentToday: 0,
  spentMonth: 620,
  running: false,

  interpretPrompt: (prompt) => {
    const task = interpret(prompt, get().profile)
    set({ draftTask: task })
  },

  clearDraft: () => set({ draftTask: null }),

  runGeneral: () => {
    // primary "check all domains" action — general scan, no interpretation step (spec v1.2 §2)
    const task = generalTask(get().profile)
    set({ draftTask: task })
    get().runDraft()
  },

  runDraft: () => {
    const task = get().draftTask
    if (!task) return
    set({ running: true })
    // simulate async pipeline
    setTimeout(() => {
      const { opportunities, stats, coverage } = runDiscovery(task, get().profile)
      const passing = opportunities.filter((o) => o.score >= task.minimumScore && o.classification !== 'blocked')

      // auto-generate alerts + watch for critical statuses / high scores
      const alerts: AlertEvent[] = []
      const watch: WatchItem[] = []
      for (const o of passing.slice(0, 12)) {
        if (o.status === 'PendingDelete' || o.status === 'Available' || o.score >= 90) {
          alerts.push({
            id: uid('alert'), domain: o.domain, channel: 'email',
            title: o.status === 'PendingDelete' ? 'מעבר ל-Pending Delete' : o.status === 'Available' ? 'הפך לפנוי' : 'הזדמנות חריגה',
            body: `${o.domain} · ציון ${o.score} · ${o.recommendation}`,
            at: new Date().toISOString(), read: false,
          })
          watch.push({ domain: o.domain, targetStatus: o.status === 'Registered' ? 'Available' : o.status, nextCheck: o.nextCheck, lastChange: o.observation.checkedAt, rule: o.recommendation })
          o.watched = true
        }
      }

      set((s) => ({
        running: false,
        currentTask: task,
        draftTask: null,
        tasks: [task, ...s.tasks],
        opportunities,
        stats,
        coverage,
        alerts: [...alerts, ...s.alerts],
        watchlist: [...watch, ...s.watchlist],
        audit: [
          logAudit('user', task.general ? 'חיפוש כללי — כל הדומיינים' : 'הרצת משימה', task.queryName, `נוצרו ${stats.generated} מועמדים · ${stats.passed} עברו סף · ${stats.blocked} נחסמו${coverage.partial ? ' · תוצאה חלקית' : ''}`),
          ...s.audit,
        ],
      }))
    }, 900)
  },

  updateProfile: (p) =>
    set((s) => ({ profile: { ...s.profile, ...p }, audit: [logAudit('user', 'עדכון פרופיל', s.profile.name, JSON.stringify(p)), ...s.audit] })),

  toggleWatch: (id) =>
    set((s) => {
      const opps = s.opportunities.map((o) => (o.id === id ? { ...o, watched: !o.watched } : o))
      const target = opps.find((o) => o.id === id)!
      let watchlist = s.watchlist
      if (target.watched && !watchlist.some((w) => w.domain === target.domain))
        watchlist = [{ domain: target.domain, targetStatus: target.status === 'Registered' ? 'Available' : target.status, nextCheck: target.nextCheck, lastChange: target.observation.checkedAt, rule: target.recommendation }, ...watchlist]
      else if (!target.watched) watchlist = watchlist.filter((w) => w.domain !== target.domain)
      return { opportunities: opps, watchlist, audit: [logAudit('user', target.watched ? 'הוספה למעקב' : 'הסרה ממעקב', target.domain, ''), ...s.audit] }
    }),

  toggleHide: (id) => set((s) => ({ opportunities: s.opportunities.map((o) => (o.id === id ? { ...o, hidden: !o.hidden } : o)) })),

  // Explicit in-site purchase after the user confirmed the verified quote (spec v1.2 §8.1.1).
  completePurchase: (oppId, quote) => {
    const s = get()
    const opp = s.opportunities.find((o) => o.id === oppId)
    if (!opp) return

    // paths not supported by the integration are never shown as done (§8.1.2)
    if (quote.path === 'monitor-only' || quote.path === 'unsupported') {
      set((st) => ({ audit: [logAudit('system', 'פעולה לא נתמכת לרכישה ישירה', opp.domain, quote.note), ...st.audit] }))
      return
    }

    const decision = evaluateAcquisition(opp, s.profile, s.spentToday, s.spentMonth)
    // block on high risk / thresholds, or on unverifiable total / insufficient balance (§8.1.1, AC-19)
    if (decision.outcome === 'blocked' || !quote.balanceOk) {
      set((st) => ({
        purchases: [makePurchase(opp, 'failed', quote), ...st.purchases],
        alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: 'רכישה נחסמה', body: !quote.balanceOk ? 'יתרה/תקציב לא מספיקים' : 'סיכון גבוה או ציון/ביטחון מתחת לסף', at: new Date().toISOString(), read: false }, ...st.alerts],
        audit: [logAudit('system', 'חסימת רכישה', opp.domain, !quote.balanceOk ? 'יתרה/תקציב' : 'כלל בטיחות כספי'), ...st.audit],
      }))
      return
    }

    // simulate the registrar order: mostly verified success, small chance of a timeout → unknown (§8.1.3)
    const roll = Math.random()
    if (roll > 0.92) {
      set((st) => ({
        purchases: [makePurchase(opp, 'unknown', quote), ...st.purchases],
        audit: [logAudit('system', 'Timeout מול הרשם — מצב לא ידוע', opp.domain, 'יש לבדוק הזמנות ובעלות לפני ניסיון נוסף'), ...st.audit],
      }))
      return
    }

    const attempt = makePurchase(opp, 'success', quote)
    const owned = makeOwned(opp, quote)
    set((st) => ({
      purchases: [attempt, ...st.purchases],
      owned: [owned, ...st.owned],
      spentToday: st.spentToday + quote.total,
      spentMonth: st.spentMonth + quote.total,
      alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: 'רכישה אומתה', body: `${opp.domain} נרשם אצל ${quote.provider} · הזמנה ${attempt.orderId}`, at: new Date().toISOString(), read: false }, ...st.alerts],
      audit: [logAudit('user', 'רכישה ישירה אומתה', opp.domain, `${quote.provider} · ${quote.currency} ${quote.total} · ${quote.note} · idem:${attempt.idempotencyKey.slice(-6)}`), ...st.audit],
    }))
  },

  approve: (id) => {
    const s = get()
    const attempt = s.purchases.find((p) => p.id === id)
    if (!attempt) return
    const opp = s.opportunities.find((o) => o.domain === attempt.domain)
    const purchases = s.purchases.map((p) => (p.id === id ? { ...p, status: 'success' as const, orderId: 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase() } : p))
    const owned: OwnedDomain[] = opp ? [makeOwned(opp, buildQuote(opp, s.profile, s.spentToday, s.spentMonth)), ...s.owned] : s.owned
    set({
      purchases,
      owned,
      spentToday: s.spentToday + attempt.amount,
      spentMonth: s.spentMonth + attempt.amount,
      audit: [logAudit('user', 'אישור רכישה', attempt.domain, `${attempt.currency} ${attempt.amount}`), ...s.audit],
    })
  },

  // Reconcile an 'unknown' (timed-out) order before any retry (§8.1.3).
  reconcile: (id) => {
    set((s) => {
      const attempt = s.purchases.find((p) => p.id === id)
      if (!attempt || attempt.status !== 'unknown') return s
      const opp = s.opportunities.find((o) => o.domain === attempt.domain)
      const found = Math.random() > 0.5 // registrar may or may not have actually recorded it
      const purchases = s.purchases.map((p) => (p.id === id ? { ...p, status: (found ? 'success' : 'failed') as PurchaseAttempt['status'], orderId: found ? 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase() : undefined } : p))
      const owned = found && opp ? [makeOwned(opp, buildQuote(opp, s.profile, s.spentToday, s.spentMonth)), ...s.owned] : s.owned
      return {
        purchases, owned,
        spentToday: found ? s.spentToday + attempt.amount : s.spentToday,
        spentMonth: found ? s.spentMonth + attempt.amount : s.spentMonth,
        audit: [logAudit('system', 'בירור הזמנה תלויה', attempt.domain, found ? 'נמצאה בעלות — הושלמה' : 'לא נמצאה — התקציב שוחרר'), ...s.audit],
      }
    })
  },

  markAlertsRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
}))
