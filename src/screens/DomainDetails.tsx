import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty, ScoreRing, PurchaseTypePill, ClassBadge, Confidence, RiskDot, SectorTag, PriceRangeTag, ValidityBadge } from '../components/ui'
import PurchaseModal from '../components/PurchaseModal'
import { PURCHASE_TYPE_META } from '../engine/config'
import { evaluateAcquisition, isFresh } from '../engine/acquisition'
import { checkOtherTlds, type TldCheck } from '../engine/engine'
import { money, timeAgo, timeUntil } from '../engine/util'

export default function DomainDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const { opportunities, profile, spentToday, spentMonth, currentTask, selectedTlds, refresh } = useStore()
  const [buying, setBuying] = useState(false)
  const [alts, setAlts] = useState<TldCheck[] | null>(null)
  const o = opportunities.find((x) => x.id === id)

  if (!o) return <Section title="כרטיס דומיין"><Empty>הדומיין לא נמצא. <Link to="/results" className="text-brand2">חזרה לתוצאות</Link></Empty></Section>

  const decision = evaluateAcquisition(o, profile, spentToday, spentMonth)
  const fresh = isFresh(o)
  const meta = PURCHASE_TYPE_META[o.purchaseType]

  const runCheckOther = () => {
    const tlds = (currentTask?.selectedTlds ?? selectedTlds).filter((t) => t !== o.tld)
    setAlts(checkOtherTlds(o.baseName, tlds.length ? tlds : ['.com', '.net', '.io', '.co'], currentTask!, profile))
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <ScoreRing score={o.score} size={72} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white" dir="ltr">{o.domain}</h1>
            <ClassBadge c={o.classification} />
            <PurchaseTypePill type={o.purchaseType} />
            <SectorTag sector={o.sector} />
          </div>
          {o.punycode && <div className="mt-1 text-xs text-warn" dir="ltr">Punycode: {o.punycode} — דגל סיכון IDN</div>}
          <p className="mt-1 max-w-2xl text-sm text-muted">{o.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ValidityBadge o={o} /><PriceRangeTag o={o} />{o.deliveryEstimate && <span className="chip !text-warn">זמן מסירה: {o.deliveryEstimate}</span>}</div>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <button className="btn-ghost" onClick={runCheckOther}>בדוק סיומות אחרות</button>
          {fresh
            ? <button className="btn-primary disabled:opacity-40" onClick={() => setBuying(true)} disabled={o.classification === 'blocked'}>{meta.buy}</button>
            : <button className="btn-ghost" onClick={() => refresh(o.id)}>רענן אימות</button>}
        </div>
      </div>
      {buying && <PurchaseModal opp={o} onClose={() => setBuying(false)} />}

      {alts && (
        <Section title="בדיקת סיומות אחרות" sub="כל סיומת היא דומיין נפרד — נבדקת מחדש דרך הספק; מוצגות רק חלופות זמינות כעת.">
          <div className="flex flex-wrap gap-2">
            {alts.map((a) => (
              <div key={a.tld} className={`rounded-xl border px-3 py-2 text-sm ${a.available ? 'border-good/40 bg-good/10' : 'border-line bg-panel2/40'}`} dir="ltr">
                <span className="font-semibold text-white">{a.domain}</span>{' '}
                {a.available ? <span className="text-good">זמין · {money(a.total!, a.currency!)}</span> : <span className="text-muted">{a.reason}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="פירוט ציון" sub="הדירוג מתחיל רק לאחר שהדומיין עבר את תנאי הקנייה">
          <div className="space-y-2.5">
            {o.components.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-xs"><span className="text-white">{c.label} <span className="text-muted">· {Math.round(c.weight * 100)}%</span></span><span className="font-semibold text-white">{c.raw}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full ${c.raw >= 80 ? 'bg-good' : c.raw >= 60 ? 'bg-brand' : c.raw >= 40 ? 'bg-warn' : 'bg-bad'}`} style={{ width: `${c.raw}%` }} /></div>
                <div className="mt-0.5 text-[10px] text-muted">{c.checks}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-panel2/40 p-3"><span className="text-sm text-muted">מדד שלמות נתונים</span><Confidence value={o.confidence} /></div>
          <p className="mt-2 text-[11px] text-muted">מדד שלמות אינו הסתברות מכירה או רווח. מחיר נמוך או ציון גבוה אינם הוכחת רווח.</p>
        </Section>

        <Section title="עלויות ואימות">
          <dl className="space-y-2 text-sm">
            {[
              ['מחיר כולל', money(o.price.total, o.price.currency)],
              ['עמלות', money(o.price.fees, o.price.currency)],
              ['מס', o.price.taxStatus],
              ['חידוש שנתי', money(o.price.renewalPrice, o.price.currency)],
              ['ספק', o.price.provider],
              ['וותק', o.ageYears ? `${o.ageYears} שנים` : 'חדש'],
              ['Referring domains', o.referringDomains ? o.referringDomains.toLocaleString() : 'חסר'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-line/60 pb-2"><dt className="text-muted">{k}</dt><dd className="font-semibold text-white" dir="ltr">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs">
            <div className="font-semibold text-white">אימות ספק</div>
            <div className="mt-1 text-muted">אומת {timeAgo(o.verification.verifiedAt)} · מקור {o.verification.provider}</div>
            <div className="text-muted">תוקף {fresh ? timeUntil(o.verification.validUntil) : 'פג — נדרש רענון'} · ref {o.verification.responseReference}</div>
            <div className="text-muted">זמינות לרישום: {o.verification.availabilityRegistration ? 'כן' : 'לא'} · למכירה קבועה: {o.verification.availabilityFixedSale ? 'כן' : 'לא'}</div>
          </div>
        </Section>

        <Section title="סיכונים">
          {o.risks.length === 0 ? <Empty>לא נמצאו סמני סיכון.</Empty> : (
            <ul className="space-y-2">
              {o.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-panel2/40 p-3">
                  <RiskDot severity={r.severity} />
                  <div><div className="text-sm font-semibold text-white">{r.type} <span className="text-xs text-muted">· {r.severity}</span></div><div className="text-xs text-muted">{r.details} · מקור: {r.source}</div></div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="בקרת רכישה" sub="אישור ידני לכל קנייה. הוראת בדיקה אינה הוראת קנייה.">
        <div className="grid gap-2 md:grid-cols-2">
          {decision.checks.map((c, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${c.ok ? 'border-good/30 bg-good/5' : 'border-bad/30 bg-bad/5'}`}><span className="text-white">{c.ok ? '✓' : '✗'} {c.label}</span><span className="text-xs text-muted" dir="ltr">{c.detail}</span></div>
          ))}
        </div>
        <div className={`mt-4 rounded-xl border p-3 text-sm ${decision.allow ? 'border-good/40 bg-good/10 text-good' : 'border-warn/40 bg-warn/10 text-warn'}`}>
          {decision.allow ? 'כל הבקרות מתקיימות — ניתן להשלים רכישה ידנית עם מזהה מניעת כפילות.' : 'בקרה אחת לפחות אינה מתקיימת — הרכישה תיחסם עד לתיקון.'}
        </div>
        <button className="btn-ghost mt-4" onClick={() => nav('/results')}>← חזרה לתוצאות</button>
      </Section>
    </div>
  )
}
