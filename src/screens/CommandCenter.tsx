import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, EXAMPLE_PROMPTS } from '../store/store'
import { Section } from '../components/ui'
import TldPicker from '../components/TldPicker'
import { money } from '../engine/util'
import type { SearchTask } from '../engine/types'

const srcLabel: Record<string, string> = { command: 'מהפקודה', profile: 'מהפרופיל', default: 'ברירת מחדל' }
const srcColor: Record<string, string> = { command: 'text-good', profile: 'text-brand2', default: 'text-muted' }

function Field({ task, k, label, value }: { task: SearchTask; k: string; label: string; value: string }) {
  const src = task.inferred[k] ?? 'default'
  return (
    <div className="stat">
      <div className="flex items-center justify-between"><span className="text-xs text-muted">{label}</span><span className={`text-[10px] ${srcColor[src]}`}>{srcLabel[src]}</span></div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

export default function CommandCenter() {
  const { draftTask, interpretPrompt, clearDraft, runDraft, runBuyNow, running, profile, selectedTlds, setSelectedTlds, updateProfile } = useStore()
  const [prompt, setPrompt] = useState('')
  const nav = useNavigate()

  const noTld = selectedTlds.length === 0
  const onInterpret = () => interpretPrompt(prompt)
  const onRun = () => { runDraft(); setTimeout(() => nav('/results'), 950) }
  const onBuyNow = () => { if (noTld) return; runBuyNow(prompt); setTimeout(() => nav('/results'), 950) }

  return (
    <div className="space-y-5">
      <Section title="מרכז חיפוש" sub="בחר סיומות, קבע תקציב וכתוב פקודה חופשית. המערכת תציג רק דומיינים שאומתה עבורם אפשרות קנייה עכשיו.">
        <TldPicker selected={selectedTlds} onChange={setSelectedTlds} />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="למשל: מצא הזדמנויות בכל התחומים לקנייה עכשיו, עד 200 דולר…"
          className="mt-3 min-h-[96px] w-full resize-y rounded-xl border border-line bg-panel2/40 p-4 text-sm leading-relaxed text-white outline-none placeholder:text-muted focus:border-brand2/60"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="stat block">
            <span className="text-xs text-muted">תקרת מחיר כולל</span>
            <div className="mt-1 flex items-center gap-1"><input type="number" value={profile.maxPrice} onChange={(e) => updateProfile({ maxPrice: Number(e.target.value) })} className="w-full bg-transparent text-sm font-semibold text-white outline-none" /><span className="text-xs text-muted">{profile.currency}</span></div>
          </label>
          <label className="stat block">
            <span className="text-xs text-muted">תקרת חידוש שנתי</span>
            <div className="mt-1 flex items-center gap-1"><input type="number" value={profile.maxRenewalPrice} onChange={(e) => updateProfile({ maxRenewalPrice: Number(e.target.value) })} className="w-full bg-transparent text-sm font-semibold text-white outline-none" /><span className="text-xs text-muted">{profile.currency}</span></div>
          </label>
          <label className="stat flex cursor-pointer flex-col justify-center">
            <span className="text-xs text-muted">מסלול מכירה במחיר קבוע</span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <input type="checkbox" checked={profile.allowFixedPrice} onChange={(e) => updateProfile({ allowFixedPrice: e.target.checked })} className="accent-brand" />
              {profile.allowFixedPrice ? 'פעיל (מסירה לא מיידית)' : 'כבוי (ברירת מחדל)'}
            </span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={onBuyNow} disabled={running || noTld}>{running ? 'בודק…' : '▶ בדוק דומיינים לקנייה עכשיו'}</button>
          <button className="btn-ghost" onClick={onInterpret} disabled={noTld}>פרש פקודה</button>
          {draftTask && <button className="btn-ghost" onClick={clearDraft}>נקה</button>}
          {noTld && <span className="text-xs text-warn">בחר סיומת אחת או «כל הנתמכות» כדי להתחיל</span>}
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted">דוגמאות פקודה</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => <button key={i} onClick={() => { setPrompt(ex); interpretPrompt(ex) }} className="chip max-w-full text-right hover:border-brand2/50 hover:text-white">{ex}</button>)}
          </div>
        </div>
      </Section>

      {draftTask && (
        <Section title="אישור פרשנות" sub="המסננים שהופקו. חסרים הושלמו מהפרופיל. אישור חיפוש לעולם אינו מפעיל חיוב."
          action={<div className="flex items-center gap-2">{draftTask.general && <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand2">כל התחומים</span>}<button className="btn-primary" onClick={onRun} disabled={running}>{running ? 'בודק…' : 'הפעל בדיקה ▶'}</button></div>}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <Field task={draftTask} k="keywords" label="תחומים" value={draftTask.semanticTopics.join(', ') || 'כל התחומים'} />
            <Field task={draftTask} k="tlds" label="סיומות" value={draftTask.selectedTlds.join(', ') || '—'} />
            <Field task={draftTask} k="language" label="שפה" value={draftTask.language === 'Any' ? 'ללא הגבלה' : draftTask.language} />
            <Field task={draftTask} k="maxLength" label="אורך מרבי" value={draftTask.lengthLimited ? `${draftTask.maxLength} תווים` : 'ללא הגבלה'} />
            <Field task={draftTask} k="maxTotalPrice" label="תקרת מחיר כולל" value={money(draftTask.maxTotalPrice, draftTask.currency)} />
            <Field task={draftTask} k="maxRenewalPrice" label="תקרת חידוש" value={money(draftTask.maxRenewalPrice, draftTask.currency)} />
            <Field task={draftTask} k="minimumScore" label="סף ציון" value={String(draftTask.minimumScore)} />
            <Field task={draftTask} k="purchaseModes" label="מסלולי רכישה" value={draftTask.purchaseModes.includes('fixed-price') ? 'רישום + מחיר קבוע' : 'רישום בלבד'} />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs leading-relaxed text-muted"><b className="text-white">פקודת מקור:</b> {draftTask.rawPrompt}</div>
        </Section>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-muted">תקרת מחיר כולל</div><div className="mt-1 text-2xl font-extrabold text-white">{money(profile.maxPrice, profile.currency)}</div><div className="mt-2 text-xs text-muted">חידוש עד {money(profile.maxRenewalPrice, profile.currency)} · יומי {money(profile.dailyBudget, profile.currency)}</div></div>
        <div className="card p-5"><div className="text-xs text-muted">סיומות נבחרות</div><div className="mt-1 text-2xl font-extrabold text-white" dir="ltr">{selectedTlds.length || '—'}</div><div className="mt-2 text-xs text-muted" dir="ltr">{selectedTlds.slice(0, 6).join(', ') || 'לא נבחרו'}</div></div>
        <div className="card p-5"><div className="text-xs text-muted">מצב רכישה</div><div className="mt-1 text-2xl font-extrabold text-white">אישור ידני</div><div className="mt-2 text-xs text-muted">הוראת בדיקה אינה הוראת קנייה</div></div>
      </div>
    </div>
  )
}
