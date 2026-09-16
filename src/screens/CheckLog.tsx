import { useState } from 'react'
import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { timeAgo } from '../engine/util'

const resultMeta: Record<string, { t: string; c: string }> = {
  'verified-available': { t: 'אומת — זמין', c: 'text-good border-good/40 bg-good/10' },
  'not-available': { t: 'לא זמין', c: 'text-muted border-line bg-panel2/60' },
  error: { t: 'שגיאה / Timeout', c: 'text-warn border-warn/40 bg-warn/10' },
  conflict: { t: 'סתירה בין מקורות', c: 'text-warn border-warn/40 bg-warn/10' },
  removed: { t: 'הוסר מהתוצאות', c: 'text-bad border-bad/40 bg-bad/10' },
}

export default function CheckLog() {
  const { checkLog } = useStore()
  const [filter, setFilter] = useState('all')
  const list = filter === 'all' ? checkLog : checkLog.filter((e) => e.result === filter)

  if (!checkLog.length)
    return <Section title="יומן בדיקות (מנהלים)" sub="מקורות, כשלים, תוקף נתונים וסיבות הסרת תוצאות."><Empty>אין רשומות. הרץ בדיקה כדי לצבור יומן אימותים.</Empty></Section>

  return (
    <Section
      title={`יומן בדיקות · ${list.length}`}
      sub="שקיפות מלאה: כל אימות מול הספק עם מקור, תשובה וחותמת זמן. שגיאה או מידע חסר לעולם אינם מתורגמים לפנוי."
      action={
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs text-white">
          <option value="all">כל התוצאות</option>
          {Object.entries(resultMeta).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
        </select>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="border-b border-line">
            <tr><th className="th">זמן</th><th className="th">דומיין</th><th className="th">ספק</th><th className="th">תוצאה</th><th className="th">פרטים</th><th className="th">reference</th></tr>
          </thead>
          <tbody>
            {list.slice(0, 200).map((e, i) => (
              <tr key={e.id} className={i % 2 ? 'bg-panel2/30' : ''}>
                <td className="td whitespace-nowrap text-xs text-muted">{timeAgo(e.at)}</td>
                <td className="td font-semibold text-white" dir="ltr">{e.domain}</td>
                <td className="td text-muted">{e.provider}</td>
                <td className="td"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${resultMeta[e.result].c}`}>{resultMeta[e.result].t}</span></td>
                <td className="td text-xs text-muted">{e.detail}</td>
                <td className="td text-[10px] text-muted" dir="ltr">{e.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
