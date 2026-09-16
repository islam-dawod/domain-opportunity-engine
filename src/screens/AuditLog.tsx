import { useStore } from '../store/store'
import { Section } from '../components/ui'
import { timeAgo } from '../engine/util'

export default function AuditLog() {
  const { audit } = useStore()
  return (
    <Section title="Audit Log (S-12)" sub="כל פעולה, מקור, משתמש, זמן ותוצאה. יומן בלתי ניתן לשינוי בידי משתמש רגיל.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="border-b border-line">
            <tr><th className="th">זמן</th><th className="th">מבצע</th><th className="th">פעולה</th><th className="th">אובייקט</th><th className="th">פרטים</th><th className="th">Request ID</th></tr>
          </thead>
          <tbody>
            {audit.map((e, i) => (
              <tr key={e.id} className={i % 2 ? 'bg-panel2/30' : ''}>
                <td className="td whitespace-nowrap text-xs text-muted">{timeAgo(e.at)}</td>
                <td className="td"><span className={`chip ${e.actor === 'user' ? '!text-brand2' : '!text-muted'}`}>{e.actor === 'user' ? 'משתמש' : 'מערכת'}</span></td>
                <td className="td font-semibold text-white">{e.action}</td>
                <td className="td text-muted" dir="ltr">{e.object}</td>
                <td className="td text-xs text-muted">{e.detail}</td>
                <td className="td text-[10px] text-muted" dir="ltr">…{e.requestId.slice(-8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
