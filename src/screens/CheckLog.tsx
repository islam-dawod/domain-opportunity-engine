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
  const { checkLog, guardEvents, health } = useStore()
  const [filter, setFilter] = useState('all')
  const list = filter === 'all' ? checkLog : checkLog.filter((e) => e.result === filter)

  if (!checkLog.length)
    return <Section title="יומן בדיקות (מנהלים)" sub="מקורות, כשלים, תוקף נתונים וסיבות הסרת תוצאות."><Empty>אין רשומות. הרץ בדיקה כדי לצבור יומן אימותים.</Empty></Section>

  return (
    <div className="space-y-5">
    <Section title="ניטור חיבורים ועצירה אוטומטית" sub="עלייה בשגיאות > 5% או 3 כשלים רצופים → השהיית החיבור; אין מקור חלופי לא מאומת.">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {health.map((h) => (
          <div key={h.provider} className={`stat ${h.suspended ? 'border-bad/40' : h.errorRatePct > 5 ? 'border-warn/40' : ''}`}>
            <div className="flex items-center justify-between"><span className="font-semibold text-white" dir="ltr">{h.provider}</span>{h.suspended ? <span className="rounded-full border border-bad/40 bg-bad/10 px-2 py-0.5 text-[11px] text-bad">מושהה</span> : <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 text-[11px] text-good">פעיל</span>}</div>
            <div className="mt-1 text-xs text-muted">בדיקות {h.checks} · שגיאות {h.failures} ({h.errorRatePct}%) · רצופות {h.consecutiveFailures}</div>
          </div>
        ))}
      </div>
      {guardEvents.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted">אירועי הפרת כלל</div>
          <ul className="space-y-1.5">
            {guardEvents.slice(0, 8).map((g) => (
              <li key={g.id} className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 p-2 text-xs">
                <span className="text-warn">⚠</span>
                <div><span className="font-semibold text-white" dir="ltr">{g.domain}</span> · <span className="text-muted">{g.kind}</span> — {g.action}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>

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
    </div>
  )
}
