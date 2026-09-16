import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { PURCHASE_TYPE_META } from '../engine/config'
import { money } from '../engine/util'

export default function MyDomains() {
  const { owned } = useStore()

  if (!owned.length)
    return (
      <Section title="הדומיינים שלי (S-13)" sub="דומיינים שנרכשו ואומתו מול הרשם.">
        <Empty>עדיין לא נרכשו דומיינים. דומיין נחשב נרכש רק לאחר אישור הרשם ואימות הופעתו בחשבון.</Empty>
      </Section>
    )

  return (
    <Section title={`הדומיינים שלי · ${owned.length}`} sub="רשם, בעלים מיועד, תפוגה, חידוש אוטומטי, מחיר חידוש וקישור לקבלה. אימות דוא״ל מצד הרשם מוצג כפעולה להשלמה.">
      <div className="grid gap-3 md:grid-cols-2">
        {owned.map((d) => (
          <div key={d.domain} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold text-white" dir="ltr">{d.domain}</span>
              <div className="flex items-center gap-1"><span className="chip">{PURCHASE_TYPE_META[d.purchaseType].he}</span><span className="chip">{d.registrar}</span></div>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {[
                ['בעלים מיועד', d.owner],
                ['נרכש', new Date(d.purchasedAt).toLocaleDateString('he-IL')],
                ['תפוגה', new Date(d.expiresAt).toLocaleDateString('he-IL')],
                ['חידוש אוטומטי', d.autoRenew ? 'מופעל' : 'כבוי'],
                ['מחיר חידוש', money(d.renewalPrice, d.currency)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line/50 pb-1.5">
                  <dt className="text-muted">{k}</dt><dd className="font-semibold text-white" dir="ltr">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={d.receiptUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs">קבלה / אסמכתה ↗</a>
              {!d.emailVerified && <span className="rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 text-xs text-warn">⚠ נדרש אימות דוא״ל מצד הרשם</span>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
