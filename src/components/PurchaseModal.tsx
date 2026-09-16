import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { buildQuote } from '../engine/acquisition'
import { PURCHASE_TYPE_META } from '../engine/config'
import { money } from '../engine/util'
import type { Opportunity } from '../engine/types'

// In-site direct purchase confirmation (spec v2.0 §9): re-verified quote + explicit approval.
export default function PurchaseModal({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const { profile, spentToday, spentMonth, completePurchase } = useStore()
  const quote = useMemo(() => buildQuote(opp, profile, spentToday, spentMonth), [opp, profile, spentToday, spentMonth])
  const [ack, setAck] = useState(false)
  const fixed = quote.purchaseType === 'fixed-price'

  const rows: [string, string][] = [
    ['סוג רכישה', PURCHASE_TYPE_META[quote.purchaseType].he],
    ['מחיר בסיס', money(quote.base, quote.currency)],
    ['מסים', quote.taxes ? money(quote.taxes, quote.currency) : 'ללא'],
    ['עמלות', money(quote.fees, quote.currency)],
    ['תקופת רישום', `${quote.registrationYears} שנה`],
    ['מחיר חידוש שנתי', money(quote.renewalPrice, quote.currency)],
    ['חידוש אוטומטי', quote.autoRenew ? 'מופעל' : 'כבוי'],
    ['בעלים מיועד', quote.ownerContact],
    ['ספק / רשם', quote.provider],
    ...(fixed ? [['זמן מסירה משוער', quote.deliveryEstimate ?? '—']] as [string, string][] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 fadein" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">אישור קנייה — {PURCHASE_TYPE_META[quote.purchaseType].he}</h3><button className="btn-ghost !px-2 !py-1" onClick={onClose}>✕</button></div>
        <div className="mt-1 text-sm text-white" dir="ltr">{opp.domain}</div>

        <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs text-muted">
          השרת מאמת מחדש זמינות ומחיר, ושולח הזמנה לרשם דרך API. הדומיין נחשב נרכש רק לאחר תשובה חיובית ואימות הופעה בחשבון.
          {fixed && ' מכירה במחיר קבוע מסומנת «ממתין למסירה» עד להשלמת ההעברה — אין הבטחת מסירה מיידית.'}
          {' '}סביבת פיתוח: Sandbox — אין חיוב אמיתי.
        </div>

        <dl className="mt-3 space-y-1.5 text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between border-b border-line/50 pb-1.5"><dt className="text-muted">{k}</dt><dd className="font-semibold text-white" dir="ltr">{v}</dd></div>)}
          <div className="flex items-center justify-between pt-1 text-base"><dt className="font-bold text-white">סכום כולל לתשלום</dt><dd className="font-extrabold text-brand2" dir="ltr">{money(quote.total, quote.currency)}</dd></div>
        </dl>

        {!quote.available && <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-2 text-xs text-warn">נתון האימות פג תוקף — נדרש רענון לפני קנייה.</div>}
        {!quote.balanceOk && <div className="mt-3 rounded-lg border border-bad/40 bg-bad/10 p-2 text-xs text-bad">יתרה/תקציב לא מספיקים — יש לטעון יתרה או להעלות תקרה.</div>}

        <label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-brand" /> אני מאשר את הסכום הסופי, פרטי הבעלות והחידוש</label>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>ביטול</button>
          <button className="btn-primary disabled:opacity-50" disabled={!ack || !quote.available || !quote.balanceOk} onClick={() => { completePurchase(opp.id, quote); onClose() }}>{fixed ? 'שלח הזמנה (ממתין למסירה)' : 'קנה עכשיו — שלח הזמנה'}</button>
        </div>
      </div>
    </div>
  )
}
