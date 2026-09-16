import { useStore } from '../store/store'
import { Section } from '../components/ui'
import TldPicker from '../components/TldPicker'
import { SCORE_COMPONENTS } from '../engine/config'

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="stat block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1"><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-sm font-semibold text-white outline-none" />{suffix && <span className="text-xs text-muted">{suffix}</span>}</div>
    </label>
  )
}

export default function Profiles() {
  const { profile, updateProfile, selectedTlds, setSelectedTlds } = useStore()

  return (
    <div className="space-y-5">
      <Section title="הגדרות" sub="פרופיל, תקציב, סיומות שמורות, מסלולי רכישה ומשקלי דירוג. שינוי תקציב או פרטי רשם מחייב הרשאה מתאימה.">
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField label="תקרת מחיר כולל" value={profile.maxPrice} suffix={profile.currency} onChange={(n) => updateProfile({ maxPrice: n })} />
          <NumberField label="תקרת חידוש שנתי" value={profile.maxRenewalPrice} suffix={profile.currency} onChange={(n) => updateProfile({ maxRenewalPrice: n })} />
          <NumberField label="סף ציון מינימלי" value={profile.minimumScore} onChange={(n) => updateProfile({ minimumScore: n })} />
          <NumberField label="תקציב יומי" value={profile.dailyBudget} suffix={profile.currency} onChange={(n) => updateProfile({ dailyBudget: n })} />
          <NumberField label="תקציב חודשי" value={profile.monthlyBudget} suffix={profile.currency} onChange={(n) => updateProfile({ monthlyBudget: n })} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="stat">
            <div className="mb-2 text-xs text-muted">מצב רכישה</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateProfile({ purchaseMode: 'manual' })} className={`chip ${profile.purchaseMode === 'manual' ? '!border-brand !bg-brand/15 !text-white' : ''}`}>אישור ידני (ברירת מחדל)</button>
              <button onClick={() => updateProfile({ purchaseMode: 'auto' })} className={`chip ${profile.purchaseMode === 'auto' ? '!border-brand !bg-brand/15 !text-white' : ''}`}>רכישה אוטומטית (הרשאה נפרדת)</button>
            </div>
            <div className="mt-2 text-[11px] text-muted">רכישה אוטומטית דורשת הרשאה נפרדת עם תקרת דומיין, יום וחודש.</div>
          </div>
          <label className="stat flex cursor-pointer flex-col justify-center">
            <span className="text-xs text-muted">מסלול מכירה במחיר קבוע</span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-white"><input type="checkbox" checked={profile.allowFixedPrice} onChange={(e) => updateProfile({ allowFixedPrice: e.target.checked })} className="accent-brand" />{profile.allowFixedPrice ? 'פעיל' : 'כבוי (ברירת מחדל)'}</span>
            <span className="mt-1 text-[11px] text-muted">התשלום יכול להתבצע כעת אך העברת הבעלות אינה בהכרח מיידית.</span>
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs text-muted">סיומות שמורות לפרופיל</div>
          <TldPicker selected={selectedTlds} onChange={setSelectedTlds} />
        </div>

        <div className="mt-4 stat"><div className="mb-1 text-xs text-muted">מילים אסורות</div><div className="flex flex-wrap gap-2">{profile.exclusions.map((e) => <span key={e} className="chip !text-bad">{e}</span>)}</div></div>
      </Section>

      <Section title="משקלי דירוג" sub="הדירוג משקלל זכירות, קריאות, סיומת, מחיר כולל וחידוש. בחיפוש כללי אין משקל לענף מסוים.">
        <div className="space-y-3">
          {SCORE_COMPONENTS.map((c) => {
            const w = Math.round((profile.weights[c.key] ?? c.weight) * 100)
            return (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm text-white">{c.label}</span>
                <input type="range" min={0} max={30} value={w} onChange={(e) => updateProfile({ weights: { ...profile.weights, [c.key]: Number(e.target.value) / 100 } })} className="flex-1 accent-brand" />
                <span className="w-10 text-left text-sm font-semibold text-white">{w}%</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-xs text-muted">סה״כ: {Math.round(Object.values(profile.weights).reduce((s, w) => s + w, 0) * 100)}% (מנורמל בעת חישוב)</div>
      </Section>
    </div>
  )
}
