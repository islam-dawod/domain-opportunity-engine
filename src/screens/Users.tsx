import { useStore } from '../store/store'
import { Section } from '../components/ui'

const roleColor: Record<string, string> = {
  Owner: 'text-good border-good/40 bg-good/10',
  Admin: 'text-brand2 border-brand/40 bg-brand/10',
  Buyer: 'text-warn border-warn/40 bg-warn/10',
  Analyst: 'text-white border-line bg-panel2/60',
  Viewer: 'text-muted border-line bg-panel2/60',
}

export default function Users() {
  const { users } = useStore()
  return (
    <Section title="ניהול משתמשים (S-11)" sub="תפקידים, הרשאות ואימות דו-שלבי. אימות דו-שלבי חובה לתפקידי Buyer, Admin ו-Owner.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead className="border-b border-line">
            <tr><th className="th">משתמש</th><th className="th">תפקיד</th><th className="th">הרשאות</th><th className="th">2FA</th></tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.name} className={i % 2 ? 'bg-panel2/30' : ''}>
                <td className="td font-semibold text-white">{u.name}</td>
                <td className="td"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${roleColor[u.role]}`}>{u.role}</span></td>
                <td className="td text-muted">{u.perms}</td>
                <td className="td">{u.twoFA ? <span className="text-good">✓ פעיל</span> : <span className="text-muted">כבוי</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-2 text-xs text-muted md:grid-cols-2">
        {['הצפנת תעבורה ומידע רגיש במנוחה', 'הרשאות מינימליות לכל API key', 'הסתרת סודות מהלוגים ומהממשק', 'Audit בלתי ניתן לשינוי בידי משתמש רגיל', 'התראה על שינוי תקציב, חיבור רשם או רכישה', 'גיבויים מוצפנים ובדיקת שחזור תקופתית'].map((t) => (
          <li key={t} className="rounded-lg border border-line bg-panel2/40 px-3 py-2">✓ {t}</li>
        ))}
      </ul>
    </Section>
  )
}
