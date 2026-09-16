import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty, ScoreRing, PurchaseTypePill, ClassBadge, Confidence, RiskDot, CoveragePanel, SectorTag, PriceRangeTag, ValidityBadge } from '../components/ui'
import PurchaseModal from '../components/PurchaseModal'
import { PURCHASE_TYPE_META } from '../engine/config'
import { isFresh } from '../engine/acquisition'
import { money } from '../engine/util'
import type { Opportunity } from '../engine/types'

function Card({ o, onBuy }: { o: Opportunity; onBuy: (o: Opportunity) => void }) {
  const { refresh } = useStore()
  const nav = useNavigate()
  const fresh = isFresh(o)
  return (
    <div className="card p-4 transition hover:border-brand2/40">
      <div className="flex items-start gap-4">
        <ScoreRing score={o.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/domain/${o.id}`} className="truncate text-lg font-extrabold text-white hover:text-brand2" dir="ltr">{o.domain}</Link>
            <ClassBadge c={o.classification} />
            <PurchaseTypePill type={o.purchaseType} />
            <SectorTag sector={o.sector} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{o.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ValidityBadge o={o} /><PriceRangeTag o={o} />{o.deliveryEstimate && <span className="chip !text-warn">מסירה: {o.deliveryEstimate}</span>}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>מחיר כולל: <b className="text-white">{money(o.price.total, o.price.currency)}</b></span>
            <span>חידוש: {money(o.price.renewalPrice, o.price.currency)}</span>
            <span>מקור: {o.source}</span>
            <span className="flex items-center gap-1">שלמות נתונים: <Confidence value={o.confidence} /></span>
            {o.risks.length > 0 && <span className="flex items-center gap-1">סיכון: {o.risks.slice(0, 3).map((r, i) => <RiskDot key={i} severity={r.severity} />)}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => nav(`/domain/${o.id}`)}>פרטים · בדוק סיומות אחרות</button>
        <div className="mr-auto flex items-center gap-2">
          {fresh
            ? <button className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-40" onClick={() => onBuy(o)} disabled={o.classification === 'blocked'}>{PURCHASE_TYPE_META[o.purchaseType].buy}</button>
            : <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => refresh(o.id)}>רענן אימות</button>}
        </div>
      </div>
    </div>
  )
}

type Sort = 'score' | 'price' | 'confidence'

export default function Results() {
  const { opportunities, currentTask, coverage } = useStore()
  const [onlyPass, setOnlyPass] = useState(true)
  const [sort, setSort] = useState<Sort>('score')
  const [type, setType] = useState<string>('all')
  const [buying, setBuying] = useState<Opportunity | null>(null)

  const threshold = currentTask?.minimumScore ?? 70

  const list = useMemo(() => {
    let l = [...opportunities]
    if (onlyPass) l = l.filter((o) => o.score >= threshold && o.classification !== 'blocked')
    if (type !== 'all') l = l.filter((o) => o.purchaseType === type)
    l.sort((a, b) => (sort === 'score' ? b.score - a.score : sort === 'price' ? a.price.total - b.price.total : b.confidence - a.confidence))
    return l
  }, [opportunities, onlyPass, sort, type, threshold])

  if (!currentTask)
    return <Section title="תוצאות לקנייה עכשיו" sub="עדיין לא הורצה בדיקה."><Empty>בחר סיומות והפעל בדיקה ב<Link to="/" className="text-brand2"> מרכז החיפוש</Link>.</Empty></Section>

  const types = ['all', ...Array.from(new Set(opportunities.map((o) => o.purchaseType)))]

  return (
    <div className="space-y-5">
      {coverage && <CoveragePanel c={coverage} />}

      {opportunities.length === 0 ? (
        <Section title="תוצאות לקנייה עכשיו"><Empty>לא נמצאו דומיינים התואמים למסננים במקורות שנבדקו. אין זה אומר שאין דומיינים פנויים — נסה סיומות נוספות או תקציב גבוה יותר.</Empty></Section>
      ) : (
        <Section
          title={`לקנייה עכשיו · ${list.length}`}
          sub={`${currentTask.general ? 'כל התחומים' : currentTask.queryName} · סיומות ${currentTask.selectedTlds.join(', ')} · סף ציון ${threshold}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <label className="chip cursor-pointer"><input type="checkbox" checked={onlyPass} onChange={(e) => setOnlyPass(e.target.checked)} className="accent-brand" /> רק שעברו סף</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs text-white">
                {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'כל סוגי הרכישה' : PURCHASE_TYPE_META[t as Opportunity['purchaseType']].he}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs text-white">
                <option value="score">מיון: ציון</option><option value="confidence">מיון: שלמות נתונים</option><option value="price">מיון: מחיר</option>
              </select>
            </div>
          }
        >
          {list.length === 0 ? <Empty>אין תוצאות שתואמות את הסינון.</Empty> : <div className="grid gap-3 lg:grid-cols-2">{list.map((o) => <Card key={o.id} o={o} onBuy={setBuying} />)}</div>}
        </Section>
      )}

      {buying && <PurchaseModal opp={buying} onClose={() => setBuying(null)} />}
    </div>
  )
}
