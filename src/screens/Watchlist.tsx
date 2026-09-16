import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { CHECK_FREQUENCY } from '../engine/config'
import { timeAgo, timeUntil } from '../engine/util'

export default function Watchlist() {
  const { watchlist } = useStore()
  if (!watchlist.length)
    return <Section title="מעקב (Watchlist)"><Empty>אין פריטים במעקב. סמן דומיין ב<Link to="/results" className="text-brand2"> תוצאות </Link>או הרץ משימה.</Empty></Section>

  return (
    <Section title={`מעקב · ${watchlist.length}`} sub="בדיקות חוזרות לפי דחיפות הסטטוס. המעקב ממשיך גם כשיצאת מהמערכת.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="border-b border-line">
            <tr><th className="th">דומיין</th><th className="th">סטטוס יעד</th><th className="th">שינוי אחרון</th><th className="th">בדיקה הבאה</th><th className="th">תדירות</th><th className="th">כלל</th></tr>
          </thead>
          <tbody>
            {watchlist.map((w, i) => (
              <tr key={w.domain + i} className={i % 2 ? 'bg-panel2/30' : ''}>
                <td className="td font-semibold text-white" dir="ltr">{w.domain}</td>
                <td className="td">{w.targetStatus}</td>
                <td className="td text-muted">{timeAgo(w.lastChange)}</td>
                <td className="td text-brand2">{timeUntil(w.nextCheck)}</td>
                <td className="td text-xs text-muted">{CHECK_FREQUENCY[w.targetStatus as string]?.label ?? '—'}</td>
                <td className="td text-xs">{w.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
