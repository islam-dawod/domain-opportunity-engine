import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { money, timeAgo } from '../engine/util'

const statusMeta: Record<string, { t: string; c: string }> = {
  success: { t: 'הושלמה', c: 'text-good border-good/40 bg-good/10' },
  'awaiting-approval': { t: 'ממתין לאישור', c: 'text-warn border-warn/40 bg-warn/10' },
  prepared: { t: 'מוכנה', c: 'text-brand2 border-brand/40 bg-brand/10' },
  failed: { t: 'נכשלה', c: 'text-bad border-bad/40 bg-bad/10' },
}

export default function Purchases() {
  const { purchases, approve, profile } = useStore()
  const yearly = purchases.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0)

  if (!purchases.length)
    return <Section title="רכישות" sub="הזמנות, סטטוסים, קבלות וחידושים"><Empty>עדיין לא בוצעו רכישות. פעולה במסך התוצאות תיצור רשומה כאן.</Empty></Section>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="stat text-center"><div className="text-xl font-extrabold text-white">{purchases.length}</div><div className="text-xs text-muted">סה״כ פעולות</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-good">{purchases.filter((p) => p.status === 'success').length}</div><div className="text-xs text-muted">הושלמו</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-warn">{purchases.filter((p) => p.status === 'awaiting-approval').length}</div><div className="text-xs text-muted">ממתינות לאישור</div></div>
        <div className="stat text-center"><div className="text-xl font-extrabold text-white">{money(yearly, profile.currency)}</div><div className="text-xs text-muted">עלות שנתית משוערת</div></div>
      </div>

      <Section title="הזמנות">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-line">
              <tr><th className="th">דומיין</th><th className="th">ספק</th><th className="th">סכום</th><th className="th">סטטוס</th><th className="th">מזהה הזמנה</th><th className="th">Idempotency</th><th className="th">זמן</th><th className="th"></th></tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={p.id} className={i % 2 ? 'bg-panel2/30' : ''}>
                  <td className="td font-semibold text-white" dir="ltr">{p.domain}</td>
                  <td className="td">{p.provider}</td>
                  <td className="td" dir="ltr">{money(p.amount, p.currency)}</td>
                  <td className="td"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta[p.status].c}`}>{statusMeta[p.status].t}</span></td>
                  <td className="td text-xs text-muted" dir="ltr">{p.orderId ?? '—'}</td>
                  <td className="td text-[10px] text-muted" dir="ltr">…{p.idempotencyKey.slice(-8)}</td>
                  <td className="td text-xs text-muted">{timeAgo(p.at)}</td>
                  <td className="td">{p.status === 'awaiting-approval' && <button className="btn-primary !px-3 !py-1 text-xs" onClick={() => approve(p.id)}>אשר</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
