import { useMemo, useState } from 'react'
import { SUPPORTED_TLDS, PURCHASABLE_TLDS } from '../engine/config'

// Multi-select TLD picker with search / select / clear / all-supported (spec v2.0 §3).
// A non-purchasable TLD is not selectable. Country TLDs show eligibility notes.
export default function TldPicker({ selected, onChange }: { selected: string[]; onChange: (t: string[]) => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => SUPPORTED_TLDS.filter((t) => t.tld.includes(q.replace(/\s/g, ''))), [q])

  const toggle = (tld: string, disabled: boolean) => {
    if (disabled) return
    onChange(selected.includes(tld) ? selected.filter((x) => x !== tld) : [...selected, tld])
  }

  return (
    <div className="rounded-xl border border-line bg-panel2/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-white">בחירת סיומות</span>
        <span className="text-xs text-muted">{selected.length ? `${selected.length} נבחרו` : 'לא נבחרה סיומת — חובה לבחור'}</span>
        <div className="mr-auto flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש סיומת…" className="w-28 rounded-lg border border-line bg-ink px-2 py-1 text-xs text-white outline-none focus:border-brand2/60" dir="ltr" />
          <button className="chip hover:text-white" onClick={() => onChange(PURCHASABLE_TLDS)}>כל הנתמכות</button>
          <button className="chip hover:text-white" onClick={() => onChange([])}>ניקוי</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((t) => {
          const on = selected.includes(t.tld)
          const disabled = !t.supported
          return (
            <button
              key={t.tld}
              onClick={() => toggle(t.tld, disabled)}
              disabled={disabled}
              title={disabled ? 'לא נתמכת לרכישה — לא ניתנת לבחירה' : t.eligibility}
              className={`rounded-lg border px-2.5 py-1 text-xs transition ${disabled ? 'cursor-not-allowed border-line/50 bg-panel2/30 text-line line-through' : on ? 'border-brand bg-brand/15 text-white' : 'border-line text-muted hover:text-white hover:border-brand2/50'}`}
              dir="ltr"
            >
              {t.tld}{t.country ? ' ⚑' : ''}
            </button>
          )
        })}
      </div>
      {selected.some((t) => SUPPORTED_TLDS.find((x) => x.tld === t)?.eligibility) && (
        <div className="mt-2 space-y-0.5 text-[11px] text-warn">
          {selected.map((t) => { const info = SUPPORTED_TLDS.find((x) => x.tld === t); return info?.eligibility ? <div key={t} dir="ltr">⚑ {t} — {info.eligibility}</div> : null })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">בחירה ריקה אינה «הכול». example.com ו-example.net הם דומיינים נפרדים בעלי זמינות ומחיר נפרדים.</p>
    </div>
  )
}
