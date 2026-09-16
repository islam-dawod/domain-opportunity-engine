import type { DomainStatus, Opportunity } from '../engine/types'
import { STATUS_META } from '../engine/config'

const toneClass: Record<string, string> = {
  good: 'text-good border-good/40 bg-good/10',
  warn: 'text-warn border-warn/40 bg-warn/10',
  bad: 'text-bad border-bad/40 bg-bad/10',
  muted: 'text-muted border-line bg-panel2/60',
}

export function StatusPill({ status }: { status: DomainStatus }) {
  const m = STATUS_META[status]
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

export function Confidence({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-good' : value >= 55 ? 'bg-warn' : 'bg-bad'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted">{value}%</span>
    </div>
  )
}

export function Section({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5 fadein">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">{children}</div>
}
