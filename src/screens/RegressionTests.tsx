import { useMemo, useState } from 'react'
import { Section } from '../components/ui'
import { runGuardTests } from '../engine/guardTests'

// Mandatory regression tests (correction spec §10). A failing "block" test prevents deployment.
export default function RegressionTests() {
  const [nonce, setNonce] = useState(0)
  const tests = useMemo(() => runGuardTests(), [nonce])
  const passed = tests.filter((t) => t.pass).length
  const failedBlocking = tests.filter((t) => !t.pass && t.blocksDeploy).length
  const allPass = passed === tests.length

  return (
    <div className="space-y-5">
      <div className={`card p-5 ${allPass ? 'border-good/40' : 'border-bad/40'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl">{allPass ? '✅' : '⛔'}</span>
          <div>
            <div className="text-lg font-bold text-white">בדיקות רגרסיה מחייבות · {passed}/{tests.length} עברו</div>
            <div className="text-sm text-muted">{allPass ? 'כל בדיקות החסימה עוברות — פריסה מותרת.' : `${failedBlocking} בדיקות חסימה נכשלו — הפריסה חסומה.`}</div>
          </div>
          <button className="btn-ghost mr-auto" onClick={() => setNonce((n) => n + 1)}>הרץ שוב</button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          כל בדיקה מריצה את חוזה האימות בפועל (<code>normalizeProviderResponse</code>, <code>deriveCanPurchase</code>).
          הפתרון אינו רשימת חסימה לשמות ספציפיים אלא כלל: תשובת שגיאה/מידע חסר/סביבת בדיקה לעולם אינם הופכים לזמינות.
        </p>
      </div>

      <Section title="תרחישים">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead className="border-b border-line">
              <tr><th className="th w-16">מזהה</th><th className="th">תרחיש</th><th className="th">צפוי</th><th className="th">בפועל</th><th className="th w-20">תוצאה</th></tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={t.id} className={i % 2 ? 'bg-panel2/30' : ''}>
                  <td className="td text-xs text-muted" dir="ltr">{t.id}</td>
                  <td className="td">{t.scenario}</td>
                  <td className="td text-xs" dir="ltr">{t.expected}</td>
                  <td className="td text-xs" dir="ltr">{t.actual}</td>
                  <td className="td"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${t.pass ? 'text-good border-good/40 bg-good/10' : 'text-bad border-bad/40 bg-bad/10'}`}>{t.pass ? 'עבר' : 'נכשל'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
