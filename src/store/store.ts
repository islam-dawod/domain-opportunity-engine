import { create } from 'zustand'
import type {
  SearchTask, Opportunity, WatchItem, PurchaseAttempt, AlertEvent, AuditEvent, SearchProfile,
} from '../engine/types'
import { DEFAULT_PROFILE } from '../engine/config'
import { interpret } from '../engine/interpreter'
import { runDiscovery } from '../engine/engine'
import { evaluateAcquisition, makePurchase } from '../engine/acquisition'
import { uid } from '../engine/util'

export const EXAMPLE_PROMPTS = [
  'מצא לי במשך 14 יום דומיינים באנגלית בתחום הוויזות וההגירה, עד 12 תווים, רק com, בתקציב של עד 750 דולר. תציג רק תוצאות בציון 80 ומעלה ותתריע מיד על דומיין שעובר ל-Pending Delete או הופך לפנוי.',
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
  watchlist: WatchItem[]
  purchases: PurchaseAttempt[]
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
  updateProfile: (p: Partial<SearchProfile>) => void
  toggleWatch: (id: string) => void
  toggleHide: (id: string) => void
  buy: (id: string) => void
  approve: (id: string) => void
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
  watchlist: [],
  purchases: [],
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

  runDraft: () => {
    const task = get().draftTask
    if (!task) return
    set({ running: true })
    // simulate async pipeline
    setTimeout(() => {
      const { opportunities, stats } = runDiscovery(task, get().profile)
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
        alerts: [...alerts, ...s.alerts],
        watchlist: [...watch, ...s.watchlist],
        audit: [
          logAudit('user', 'הרצת משימה', task.queryName, `נוצרו ${stats.generated} מועמדים · ${stats.passed} עברו סף · ${stats.blocked} נחסמו`),
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

  buy: (id) => {
    const s = get()
    const opp = s.opportunities.find((o) => o.id === id)
    if (!opp) return
    const decision = evaluateAcquisition(opp, s.profile, s.spentToday, s.spentMonth)
    if (decision.outcome === 'blocked') {
      set((st) => ({ alerts: [{ id: uid('alert'), domain: opp.domain, channel: 'inapp', title: 'רכישה נחסמה', body: 'סיכון גבוה או ציון/ביטחון מתחת לסף', at: new Date().toISOString(), read: false }, ...st.alerts], audit: [logAudit('system', 'חסימת רכישה', opp.domain, 'כלל בטיחות כספי'), ...st.audit] }))
      return
    }
    const success = decision.allowAutoBuy
    const attempt = makePurchase(opp, success ? 'success' : 'awaiting-approval')
    set((st) => ({
      purchases: [attempt, ...st.purchases],
      spentToday: success ? st.spentToday + opp.price.price : st.spentToday,
      spentMonth: success ? st.spentMonth + opp.price.price : st.spentMonth,
      audit: [logAudit('user', success ? 'רכישה' : 'הכנת רכישה לאישור', opp.domain, `${opp.price.provider} · $${opp.price.price} · idem:${attempt.idempotencyKey.slice(-6)}`), ...st.audit],
    }))
  },

  approve: (id) => {
    set((s) => {
      const attempt = s.purchases.find((p) => p.id === id)
      if (!attempt) return s
      const opp = s.opportunities.find((o) => o.domain === attempt.domain)
      const purchases = s.purchases.map((p) => (p.id === id ? { ...p, status: 'success' as const, orderId: 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase() } : p))
      return {
        purchases,
        spentToday: s.spentToday + attempt.amount,
        spentMonth: s.spentMonth + attempt.amount,
        audit: [logAudit('user', 'אישור רכישה', attempt.domain, `$${attempt.amount}`), ...s.audit],
      }
    })
  },

  markAlertsRead: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),
}))
