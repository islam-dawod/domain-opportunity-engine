import { useStore } from '../store/store'
import { Section } from '../components/ui'
import { SCORE_COMPONENTS } from '../engine/config'
import type { PurchaseMode } from '../engine/types'

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="stat block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-sm font-semibold text-white outline-none" />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  )
}

const MODES: PurchaseMode[] = ['monitor', 'notify', 'approve', 'auto']
const MODE_HE: Record<PurchaseMode, string> = { monitor: 'מעקב בלבד', notify: 'התראה', approve: 'אישור', auto: 'רכישה אוטומטית' }

export default function Profiles() {
  const { profile, updateProfile } = useStore()

  return (
    <div className="space-y-5">
      <Section title="פרופיל וכללים (S-09)" sub="הגדרה חד-פעמית של תקציב, סיומות, ספים ומשקלי דירוג. שינוי תקציב או הפעלת Auto-buy דורשים אימות חזק.">
        <div className="grid gap-3 md:grid-cols-3">
          <NumberField label="תקרת דומיין" value={profile.maxPrice} suffix={profile.currency} onChange={(n) => updateProfile({ maxPrice: n })} />
          <NumberField label="תקציב יומי" value={profile.dailyBudget} suffix={profile.currency} onChange={(n) => updateProfile({ dailyBudget: n })} />
          <NumberField label="תקציב חודשי" value={profile.monthlyBudget} suffix={profile.currency} onChange={(n) => updateProfile({ monthlyBudget: n })} />
          <NumberField label="סף ציון מינימלי" value={profile.minimumScore} onChange={(n) => updateProfile({ minimumScore: n })} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="stat">
            <div className="mb-2 text-xs text-muted">מצב רכישה</div>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button key={m} onClick={() => updateProfile({ purchaseMode: m })} className={`chip ${profile.purchaseMode === m ? '!border-brand !bg-brand/15 !text-white' : ''}`}>{MODE_HE[m]}</button>
              ))}
            </div>
          </div>
          <div className="stat">
            <div className="mb-2 text-xs text-muted">סיומות מועדפות</div>
            <div className="flex flex-wrap gap-2">
              {['.com', '.net', '.org', '.io', '.co', '.ai'].map((t) => {
                const on = profile.tlds.includes(t)
                return <button key={t} onClick={() => updateProfile({ tlds: on ? profile.tlds.filter((x) => x !== t) : [...profile.tlds, t] })} className={`chip ${on ? '!border-brand !bg-brand/15 !text-white' : ''}`} dir="ltr">{t}</button>
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 stat">
          <div className="mb-1 text-xs text-muted">מילים אסורות</div>
          <div className="flex flex-wrap gap-2">{profile.exclusions.map((e) => <span key={e} className="chip !text-bad">{e}</span>)}</div>
        </div>
      </Section>

      <Section title="משקלי דירוג" sub="משקלים ניתנים לשינוי לכל פרופיל חיפוש. הציון מחושב רק לאחר אימות סטטוס.">
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
        <div className="mt-3 text-xs text-muted">סה״כ משקלים: {Math.round(Object.values(profile.weights).reduce((s, w) => s + w, 0) * 100)}% (מנורמל בעת חישוב)</div>
      </Section>
    </div>
  )
}
