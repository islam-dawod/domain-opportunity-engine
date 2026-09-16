import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty, ScoreRing, StatusPill, ClassBadge, Confidence, RiskDot } from '../components/ui'
import { money } from '../engine/util'
import type { Opportunity } from '../engine/types'

function Card({ o }: { o: Opportunity }) {
  const { toggleWatch, toggleHide, buy } = useStore()
  const nav = useNavigate()
  return (
    <div className="card p-4 transition hover:border-brand2/40">
      <div className="flex items-start gap-4">
        <ScoreRing score={o.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/domain/${o.id}`} className="truncate text-lg font-extrabold text-white hover:text-brand2" dir="ltr">{o.domain}</Link>
            <ClassBadge c={o.classification} />
            <StatusPill status={o.status} />
            {o.price.premium && <span className="chip !text-warn">Premium</span>}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{o.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>מחיר: <b className="text-white">{money(o.price.price, o.price.currency)}</b></span>
            <span>חידוש: {money(o.price.renewal, o.price.currency)}</span>
            <span>מקור: {o.observation.source}</span>
            <span className="flex items-center gap-1">ביטחון: <Confidence value={o.confidence} /></span>
            {o.risks.length > 0 && (
              <span className="flex items-center gap-1">
                סיכון: {o.risks.slice(0, 3).map((r, i) => <RiskDot key={i} severity={r.severity} />)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">מומלץ: <b className="text-white">{o.recommendation}</b></span>
        <div className="mr-auto flex items-center gap-2">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => toggleWatch(o.id)}>{o.watched ? '✓ במעקב' : '＋ מעקב'}</button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => nav(`/domain/${o.id}`)}>פרטים</button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => toggleHide(o.id)}>הסתר</button>
          <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => buy(o.id)} disabled={o.classification === 'blocked'}>
            {o.status === 'Available' ? 'רכוש' : o.status === 'Auction' ? 'הצע במכרז' : 'Backorder'}
          </button>
        </div>
      </div>
    </div>
  )
}

type Sort = 'score' | 'price' | 'confidence'

export default function Results() {
  const { opportunities, currentTask, stats } = useStore()
  const [onlyPass, setOnlyPass] = useState(true)
  const [sort, setSort] = useState<Sort>('score')
  const [status, setStatus] = useState<string>('all')

  const threshold = currentTask?.minimumScore ?? 80

  const list = useMemo(() => {
    let l = opportunities.filter((o) => !o.hidden)
    if (onlyPass) l = l.filter((o) => o.score >= threshold && o.classification !== 'blocked')
    if (status !== 'all') l = l.filter((o) => o.status === status)
    l = [...l].sort((a, b) => (sort === 'score' ? b.score - a.score : sort === 'price' ? a.price.price - b.price.price : b.confidence - a.confidence))
    return l
  }, [opportunities, onlyPass, sort, status, threshold])

  if (!opportunities.length)
    return (
      <Section title="תוצאות" sub="עדיין לא הורצה משימה.">
        <Empty>הזן פקודה ב<Link to="/" className="text-brand2"> מרכז הפקודות </Link>כדי לראות הזדמנויות.</Empty>
      </Section>
    )

  const statuses = ['all', ...Array.from(new Set(opportunities.map((o) => o.status)))]

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['מועמדים', stats.generated], ['אחרי ניקוי', stats.deduped], ['נבדקו', stats.verified], ['עברו סף', stats.passed], ['נחסמו', stats.blocked],
          ].map(([l, v]) => (
            <div key={l} className="stat text-center">
              <div className="text-xl font-extrabold text-white">{v as number}</div>
              <div className="text-xs text-muted">{l}</div>
            </div>
          ))}
        </div>
      )}

      <Section
        title={`הזדמנויות · ${list.length}`}
        sub={currentTask ? `משימה: ${currentTask.queryName} · סף ציון ${threshold}` : undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="chip cursor-pointer"><input type="checkbox" checked={onlyPass} onChange={(e) => setOnlyPass(e.target.checked)} className="accent-brand" /> רק שעברו סף</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs text-white">
              {statuses.map((s) => <option key={s} value={s}>{s === 'all' ? 'כל הסטטוסים' : s}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs text-white">
              <option value="score">מיון: ציון</option>
              <option value="confidence">מיון: ביטחון</option>
              <option value="price">מיון: מחיר</option>
            </select>
          </div>
        }
      >
        {list.length === 0 ? <Empty>אין הזדמנויות שתואמות את הסינון.</Empty> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((o) => <Card key={o.id} o={o} />)}
          </div>
        )}
      </Section>
    </div>
  )
}
