import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty, ScoreRing, StatusPill, ClassBadge, Confidence, RiskDot, SectorTag, NewNameTag, PriceRangeTag } from '../components/ui'
import PurchaseModal from '../components/PurchaseModal'
import { STATUS_META, CHECK_FREQUENCY } from '../engine/config'
import { evaluateAcquisition, resolvePath } from '../engine/acquisition'
import { money, timeAgo, timeUntil } from '../engine/util'

const PATH_HE: Record<string, string> = { register: 'רישום ישיר', closeout: 'קנייה Closeout', auction: 'הצעה במכרז', backorder: 'Backorder', 'monitor-only': 'מעקב בלבד', unsupported: 'לא נתמך' }

export default function DomainDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const { opportunities, profile, spentToday, spentMonth, toggleWatch } = useStore()
  const [buying, setBuying] = useState(false)
  const o = opportunities.find((x) => x.id === id)

  if (!o) return <Section title="פרטי דומיין"><Empty>הדומיין לא נמצא. <Link to="/results" className="text-brand2">חזרה לתוצאות</Link></Empty></Section>

  const decision = evaluateAcquisition(o, profile, spentToday, spentMonth)
  const meta = STATUS_META[o.status]
  const freq = CHECK_FREQUENCY[o.status]
  const path = resolvePath(o.status)
  const canBuy = o.classification !== 'blocked' && path !== 'monitor-only' && path !== 'unsupported'

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <ScoreRing score={o.score} size={72} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white" dir="ltr">{o.domain}</h1>
            <ClassBadge c={o.classification} />
            <StatusPill status={o.status} />
            <SectorTag sector={o.sector} />
            {o.price.premium && <span className="chip !text-warn">Premium</span>}
          </div>
          {o.punycode && <div className="mt-1 text-xs text-warn" dir="ltr">Punycode: {o.punycode} — דגל סיכון IDN</div>}
          <p className="mt-1 max-w-2xl text-sm text-muted">{o.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><NewNameTag isNew={o.isNewName} /><PriceRangeTag o={o} /><span className="chip">מסלול: {PATH_HE[path]}</span></div>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <button className="btn-ghost" onClick={() => toggleWatch(o.id)}>{o.watched ? '✓ במעקב' : '＋ מעקב'}</button>
          <button className="btn-primary disabled:opacity-40" onClick={() => setBuying(true)} disabled={!canBuy}>
            {o.status === 'Available' ? 'רכוש עכשיו' : o.status === 'Auction' ? 'הצע במכרז' : o.status === 'Closeout' ? 'קנה Closeout' : path === 'backorder' ? 'הזמן Backorder' : 'מעקב בלבד'}
          </button>
        </div>
      </div>
      {buying && <PurchaseModal opp={o} onClose={() => setBuying(false)} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="פירוט ציון" sub="ציון משוקלל 0–100 (מחושב לאחר אימות סטטוס)">
          <div className="space-y-2.5">
            {o.components.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white">{c.label} <span className="text-muted">· {Math.round(c.weight * 100)}%</span></span>
                  <span className="font-semibold text-white">{c.raw}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className={`h-full ${c.raw >= 80 ? 'bg-good' : c.raw >= 60 ? 'bg-brand' : c.raw >= 40 ? 'bg-warn' : 'bg-bad'}`} style={{ width: `${c.raw}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] text-muted">{c.checks}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-panel2/40 p-3">
            <span className="text-sm text-muted">מדד ביטחון (Confidence)</span>
            <Confidence value={o.confidence} />
          </div>
        </Section>

        <Section title="עלויות ומקורות">
          <dl className="space-y-2 text-sm">
            {[
              ['מחיר נוכחי', money(o.price.price, o.price.currency)],
              ['עלות חידוש שנתית', money(o.price.renewal, o.price.currency)],
              ['ספק', o.price.provider],
              ['וותק', o.ageYears ? `${o.ageYears} שנים` : 'חדש / פנוי'],
              ['Referring domains', o.referringDomains.toLocaleString()],
              ['תנועה משוערת', o.estTraffic ? o.estTraffic.toLocaleString() + '/חודש' : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-line/60 pb-2">
                <dt className="text-muted">{k}</dt><dd className="font-semibold text-white" dir="ltr">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs">
            <div className="font-semibold text-white">ציר זמן ומעקב</div>
            <div className="mt-1 text-muted">נבדק לאחרונה {timeAgo(o.observation.checkedAt)} · מקור {o.observation.source}</div>
            <div className="text-muted">בדיקה הבאה {timeUntil(o.nextCheck)} · תדירות: {freq?.label}</div>
            <div className="text-muted">משמעות: {meta.meaning} · פעולה: {meta.action}</div>
          </div>
        </Section>

        <Section title="סיכונים">
          {o.risks.length === 0 ? <Empty>לא נמצאו סמני סיכון.</Empty> : (
            <ul className="space-y-2">
              {o.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-panel2/40 p-3">
                  <RiskDot severity={r.severity} />
                  <div>
                    <div className="text-sm font-semibold text-white">{r.type} <span className="text-xs text-muted">· {r.severity}</span></div>
                    <div className="text-xs text-muted">{r.details} · מקור: {r.source}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="בקרת רכישה בטוחה" sub={`מצב פעיל: ${decision.mode} · תוצאה: ${outcomeLabel(decision.outcome)}`}>
        <div className="grid gap-2 md:grid-cols-2">
          {decision.checks.map((c, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${c.ok ? 'border-good/30 bg-good/5' : 'border-bad/30 bg-bad/5'}`}>
              <span className="text-white">{c.ok ? '✓' : '✗'} {c.label}</span>
              <span className="text-xs text-muted" dir="ltr">{c.detail}</span>
            </div>
          ))}
        </div>
        <div className={`mt-4 rounded-xl border p-3 text-sm ${decision.allowAutoBuy ? 'border-good/40 bg-good/10 text-good' : 'border-warn/40 bg-warn/10 text-warn'}`}>
          {decision.allowAutoBuy
            ? 'כל בקרות ה-Auto-buy מתקיימות — רכישה אוטומטית מותרת עם מזהה Idempotency.'
            : 'לפחות בקרה אחת לא מתקיימת — המערכת תעבור למצב Approval ולא תבצע רכישה אוטומטית.'}
        </div>
        <button className="btn-ghost mt-4" onClick={() => nav('/results')}>← חזרה לתוצאות</button>
      </Section>
    </div>
  )
}

function outcomeLabel(o: string) {
  return { monitor: 'מעקב בלבד', notify: 'התראה', 'awaiting-approval': 'ממתין לאישור', 'auto-executed': 'בוצע אוטומטית', blocked: 'נחסם' }[o] ?? o
}
