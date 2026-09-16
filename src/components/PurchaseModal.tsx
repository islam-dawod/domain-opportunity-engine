import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { buildQuote } from '../engine/acquisition'
import { money } from '../engine/util'
import type { Opportunity } from '../engine/types'

// In-site direct purchase (spec v1.2 §8.1.1): shows a re-verified quote and requires an
// explicit confirmation — the button is not a redirect to an external site.
export default function PurchaseModal({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const { profile, spentToday, spentMonth, completePurchase } = useStore()
  const quote = useMemo(() => buildQuote(opp, profile, spentToday, spentMonth), [opp, profile, spentToday, spentMonth])
  const [ack, setAck] = useState(false)

  const unsupported = quote.path === 'monitor-only' || quote.path === 'unsupported'
  const rows: [string, string][] = [
    ['מסלול רכישה', quote.note],
    ['מחיר בסיס', money(quote.base, quote.currency)],
    ['מסים (משוער)', money(quote.taxes, quote.currency)],
    ['עמלות', money(quote.fees, quote.currency)],
    ['תקופת רישום', `${quote.registrationYears} שנה`],
    ['מחיר חידוש שנתי', money(quote.renewalPrice, quote.currency)],
    ['חידוש אוטומטי', quote.autoRenew ? 'מופעל' : 'כבוי'],
    ['בעלים מיועד', quote.ownerContact],
    ['ספק / רשם', quote.provider],
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 fadein" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">רכישה ישירה — אישור הזמנה</h3>
          <button className="btn-ghost !px-2 !py-1" onClick={onClose}>✕</button>
        </div>
        <div className="mt-1 text-sm text-white" dir="ltr">{opp.domain}</div>

        {unsupported ? (
          <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            הפעולה עבור סטטוס «{opp.status}» אינה נתמכת לרכישה ישירה ({quote.note}). המערכת לא תציג אותה כאילו בוצעה.
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs text-muted">
              בלחיצה על «קנייה» השרת מאמת מחדש זמינות, מחיר, מטבע, מסים ועמלות, תקופת רישום וחידוש, ושולח הזמנה לרשם דרך API.
              הדומיין נחשב נרכש רק לאחר אישור הרשם ואימות הופעה בחשבון. סביבת פיתוח: Sandbox — אין חיוב אמיתי.
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line/50 pb-1.5">
                  <dt className="text-muted">{k}</dt><dd className="font-semibold text-white" dir="ltr">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 text-base">
                <dt className="font-bold text-white">סכום כולל לתשלום</dt>
                <dd className="font-extrabold text-brand2" dir="ltr">{money(quote.total, quote.currency)}</dd>
              </div>
            </dl>

            {!quote.balanceOk && (
              <div className="mt-3 rounded-lg border border-bad/40 bg-bad/10 p-2 text-xs text-bad">יתרה/תקציב לא מספיקים — יש לטעון יתרה או להעלות תקרה לפני ההזמנה.</div>
            )}
            {!quote.verifiable && (
              <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-2 text-xs text-warn">סכום סופי אינו ניתן לאימות מלא בערוץ זה — נדרשת הצעה מעודכנת.</div>
            )}

            <label className="mt-3 flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-brand" />
              אני מאשר את הסכום הסופי ואת פרטי הבעלות
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn-ghost" onClick={onClose}>ביטול</button>
              <button className="btn-primary disabled:opacity-50" disabled={!ack || !quote.balanceOk} onClick={() => { completePurchase(opp.id, quote); onClose() }}>
                קנייה — שלח הזמנה לרשם
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
