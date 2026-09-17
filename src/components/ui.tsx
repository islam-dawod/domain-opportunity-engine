import type { PurchaseType, Opportunity, CoverageReport, VerificationState } from '../engine/types'
import { PURCHASE_TYPE_META } from '../engine/config'
import { money, timeAgo } from '../engine/util'
import { isFresh } from '../engine/acquisition'

const toneClass: Record<string, string> = {
  good: 'text-good border-good/40 bg-good/10',
  warn: 'text-warn border-warn/40 bg-warn/10',
  bad: 'text-bad border-bad/40 bg-bad/10',
  muted: 'text-muted border-line bg-panel2/60',
}

export function PurchaseTypePill({ type }: { type: PurchaseType }) {
  const m = PURCHASE_TYPE_META[type]
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass[m.tone]}`}>{m.he}</span>
}

const STATE_META: Record<VerificationState, { he: string; tone: string }> = {
  AVAILABLE_VERIFIED: { he: 'זמינות מאומתת', tone: 'good' },
  FIXED_PRICE_VERIFIED: { he: 'מכירה מאומתת', tone: 'warn' },
  CHECKING: { he: 'בבדיקה', tone: 'muted' },
  UNVERIFIED: { he: 'טרם אומת', tone: 'muted' },
  STALE: { he: 'פג תוקף', tone: 'warn' },
  REGISTERED: { he: 'רשום', tone: 'muted' },
  CONFLICT: { he: 'סתירה — בבירור', tone: 'bad' },
  UNKNOWN: { he: 'לא אומת', tone: 'bad' },
  ERROR: { he: 'שגיאה', tone: 'bad' },
  UNSUPPORTED: { he: 'לא נתמך', tone: 'muted' },
}
// The verification state is server-derived; it gates the availability label (correction §4).
export function StateBadge({ state }: { state: VerificationState }) {
  const m = STATE_META[state]
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass[m.tone]}`}>{m.he}</span>
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const color = score >= 90 ? '#22c55e' : score >= 80 ? '#4f9dff' : score >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#22304d" strokeWidth={6} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold" style={{ color }}>{score}</div>
    </div>
  )
}

const clsLabel: Record<Opportunity['classification'], { t: string; c: string }> = {
  exceptional: { t: 'הזדמנות חריגה', c: 'text-good border-good/40 bg-good/10' },
  good: { t: 'הזדמנות טובה', c: 'text-brand2 border-brand/40 bg-brand/10' },
  interesting: { t: 'מעניין', c: 'text-warn border-warn/40 bg-warn/10' },
  weak: { t: 'חלש', c: 'text-muted border-line bg-panel2/60' },
  blocked: { t: 'פסול', c: 'text-bad border-bad/40 bg-bad/10' },
}
export function ClassBadge({ c }: { c: Opportunity['classification'] }) {
  const m = clsLabel[c]
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.c}`}>{m.t}</span>
}

export function RiskDot({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const c = severity === 'high' ? 'bg-bad' : severity === 'medium' ? 'bg-warn' : 'bg-good'
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />
}

// Data-completeness index — explicitly NOT a sale/profit probability (spec v2.0 §6).
export function Confidence({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-good' : value >= 55 ? 'bg-warn' : 'bg-bad'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
      <span className="text-xs text-muted">{value}%</span>
    </div>
  )
}

// Validity window state for the buy button (spec v2.0 §5). Shows "verified at" only when a
// real provider check exists (verificationId + verifiedAt) — never on page open (correction §5).
export function ValidityBadge({ o }: { o: Opportunity }) {
  if (!o.verification.verificationId || !o.verification.verifiedAt)
    return <span className="rounded-full border border-line bg-panel2/60 px-2 py-0.5 text-[11px] text-muted">טרם אומת</span>
  return isFresh(o)
    ? <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 text-[11px] text-good">אומת {timeAgo(o.verification.verifiedAt)} · בתוקף</span>
    : <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] text-warn">STALE — נדרש רענון</span>
}

// Availability verification provenance — separated from discovery source (correction §6).
export function Provenance({ o }: { o: Opportunity }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
      <span>מקור גילוי: <b className="text-white/80">{o.discoverySource}</b></span>
      <span>אימות זמינות: <b className="text-white/80">{o.verification.verificationId ? o.verification.provider : '— טרם אומת'}</b></span>
    </div>
  )
}

export function Section({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5 fadein">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-white">{title}</h2>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">{children}</div>
}

export function CoveragePanel({ c }: { c: CoverageReport }) {
  return (
    <div className={`card p-4 ${c.partial ? 'border-warn/40' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-white">כיסוי הבדיקה</span>
        {c.partial ? <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">כיסוי חלקי</span>
          : <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 text-xs font-semibold text-good">מלא</span>}
        <span className="mr-auto text-xs text-muted">עודכן {timeAgo(c.updatedAt)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['מועמדים', c.candidates], ['נבדקו', c.checked], ['אומתו לרכישה', c.verifiedForPurchase]].map(([l, v]) => (
          <div key={l} className="stat text-center"><div className="text-lg font-extrabold text-white">{v as number}</div><div className="text-xs text-muted">{l}</div></div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><div className="text-xs text-muted">מקורות שנבדקו</div><div className="mt-1 flex flex-wrap gap-1">{c.sourcesChecked.map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
        <div><div className="text-xs text-muted">סיומות מכוסות · {c.tldsCovered.length}</div><div className="mt-1 flex flex-wrap gap-1" dir="ltr">{c.tldsCovered.map((t) => <span key={t} className="chip">{t}</span>)}</div></div>
      </div>
      {c.sourcesFailed.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{c.sourcesFailed.map((f) => <span key={f} className="rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 text-xs text-warn">⚠ לא ענה: {f}</span>)}</div>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        המערכת סורקת מועמדים מהמקורות המחוברים ולא את כל צירופי השמות בעולם. אפס תוצאות פירושו «לא נמצאו דומיינים התואמים למסננים במקורות שנבדקו» — לא «אין דומיינים פנויים».
      </p>
    </div>
  )
}

export function SectorTag({ sector }: { sector: string }) {
  return <span className="rounded-full border border-line bg-panel2/60 px-2 py-0.5 text-[11px] text-muted">{sector}</span>
}

export function PriceRangeTag({ o }: { o: Opportunity }) {
  if (o.priceRange)
    return <span className="chip !text-good" title={`מקור: ${o.priceRange.source} · ${o.priceRange.date}`}>שווי שוק משוער {money(o.priceRange.low, o.price.currency)}–{money(o.priceRange.high, o.price.currency)}</span>
  return <span className="chip" title="אין עסקאות השוואה זמינות">מתאים לתקציב (ללא טענת רווח)</span>
}
