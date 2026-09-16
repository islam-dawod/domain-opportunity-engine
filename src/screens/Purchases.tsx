import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { PURCHASE_TYPE_META } from '../engine/config'
import { money, timeAgo } from '../engine/util'

const statusMeta: Record<string, { t: string; c: string }> = {
  sent: { t: 'נשלחה', c: 'text-brand2 border-brand/40 bg-brand/10' },
  processing: { t: 'בטיפול', c: 'text-brand2 border-brand/40 bg-brand/10' },
  success: { t: 'הצליחה ואומתה', c: 'text-good border-good/40 bg-good/10' },
  'awaiting-delivery': { t: 'ממתינה למסירה', c: 'text-warn border-warn/40 bg-warn/10' },
  unknown: { t: 'לא ידוע (Timeout)', c: 'text-warn border-warn/40 bg-warn/10' },
  failed: { t: 'נכשלה', c: 'text-bad border-bad/40 bg-bad/10' },
}

export default function Purchases() {
  const { orders, reconcile, profile } = useStore()
  const yearly = orders.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0)

  if (!orders.length)
    return <Section title="הזמנות" sub="נשלחה, בטיפול, הצליחה, נכשלה, לא ידוע או ממתינה למסירה."><Empty>עדיין לא בוצעו הזמנות. פעולת קנייה במסך התוצאות תיצור רשומה כאן.</Empty></Section>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="stat text-center"><div className="text-xl font-extrabold text-white">{orders.length}</div><div className="text-xs text-muted">סה״כ הזמנות</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-good">{orders.filter((p) => p.status === 'success').length}</div><div className="text-xs text-muted">הצליחו</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-warn">{orders.filter((p) => p.status === 'awaiting-delivery' || p.status === 'unknown').length}</div><div className="text-xs text-muted">ממתינות/לא ידוע</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-white">{money(yearly, profile.currency)}</div><div className="text-xs text-muted">עלות שנתית משוערת</div></div>
      </div>

      <Section title="הזמנות">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="border-b border-line">
              <tr><th className="th">דומיין</th><th className="th">סוג</th><th className="th">ספק</th><th className="th">סכום</th><th className="th">סטטוס</th><th className="th">order_id</th><th className="th">provider_order_id</th><th className="th">זמן</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {orders.map((p, i) => (
                <tr key={p.id} className={i % 2 ? 'bg-panel2/30' : ''}>
                  <td className="td font-semibold text-white" dir="ltr">{p.domain}</td>
                  <td className="td text-xs">{PURCHASE_TYPE_META[p.purchaseType].he}</td>
                  <td className="td">{p.provider}</td>
                  <td className="td" dir="ltr">{money(p.amount, p.currency)}</td>
                  <td className="td"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta[p.status].c}`}>{statusMeta[p.status].t}</span></td>
                  <td className="td text-xs text-muted" dir="ltr">{p.id}</td>
                  <td className="td text-xs text-muted" dir="ltr">{p.providerOrderId ?? '—'}</td>
                  <td className="td text-xs text-muted">{timeAgo(p.at)}</td>
                  <td className="td">{p.status === 'unknown' && <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => reconcile(p.id)}>בדוק מצב</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">מפתח מניעת כפילות ונעילת דומיין בצד השרת. אחרי Timeout המצב «לא ידוע» — בודקים הזמנות ובעלות לפני ניסיון חוזר, גם מול רשם אחר.</p>
      </Section>
    </div>
  )
}
