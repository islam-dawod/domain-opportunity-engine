import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, EXAMPLE_PROMPTS } from '../store/store'
import { Section } from '../components/ui'
import { money } from '../engine/util'
import type { SearchTask } from '../engine/types'

const srcLabel: Record<string, string> = { command: 'מהפקודה', profile: 'מהפרופיל', default: 'ברירת מחדל' }
const srcColor: Record<string, string> = { command: 'text-good', profile: 'text-brand2', default: 'text-muted' }

function Field({ task, k, label, value }: { task: SearchTask; k: string; label: string; value: string }) {
  const src = task.inferred[k] ?? 'default'
  return (
    <div className="stat">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-[10px] ${srcColor[src]}`}>{srcLabel[src]}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

export default function CommandCenter() {
  const { draftTask, interpretPrompt, clearDraft, runDraft, running, profile, opportunities } = useStore()
  const [prompt, setPrompt] = useState('')
  const nav = useNavigate()

  const onInterpret = () => { if (prompt.trim()) interpretPrompt(prompt) }
  const onRun = () => { runDraft(); setTimeout(() => nav('/results'), 950) }

  return (
    <div className="space-y-5">
      <Section
        title="מרכז הפקודות"
        sub="כתוב פקודה חופשית בעברית או באנגלית. המנוע יפרש אותה למסננים, ישלים חוסרים מהפרופיל, ויתחיל סריקה."
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="למשל: מצא לי דומיינים קצרים באנגלית בתחום ההגירה, עד 500 דולר, רק com, ציון 80 ומעלה…"
          className="min-h-[120px] w-full resize-y rounded-xl border border-line bg-panel2/40 p-4 text-sm leading-relaxed text-white outline-none placeholder:text-muted focus:border-brand2/60"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={onInterpret} disabled={!prompt.trim()}>פרש פקודה ↵</button>
          {draftTask && <button className="btn-ghost" onClick={clearDraft}>נקה</button>}
          <span className="mr-auto text-xs text-muted">שמור תבניות · הפעלה חד-פעמית או רציפה</span>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted">דוגמאות פקודה</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button key={i} onClick={() => { setPrompt(ex); interpretPrompt(ex) }} className="chip max-w-full text-right hover:border-brand2/50 hover:text-white">
                {ex.length > 70 ? ex.slice(0, 70) + '…' : ex}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {draftTask && (
        <Section
          title="אישור פרשנות (S-02)"
          sub="אלה המסננים שהופקו מהפקודה. אפשר להריץ מיד — נתונים חסרים הושלמו מהפרופיל."
          action={<button className="btn-primary" onClick={onRun} disabled={running}>{running ? 'סורק…' : 'הפעל משימה ▶'}</button>}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <Field task={draftTask} k="keywords" label="מילות מפתח" value={draftTask.keywords.slice(0, 4).join(', ')} />
            <Field task={draftTask} k="keywords" label="תחומים" value={draftTask.semanticTopics.join(', ') || '—'} />
            <Field task={draftTask} k="language" label="שפה" value={draftTask.language} />
            <Field task={draftTask} k="tlds" label="סיומות" value={draftTask.tlds.join(', ')} />
            <Field task={draftTask} k="maxLength" label="אורך מרבי" value={`${draftTask.maxLength} תווים`} />
            <Field task={draftTask} k="maxPrice" label="תקציב לדומיין" value={money(draftTask.maxPrice, draftTask.currency)} />
            <Field task={draftTask} k="minimumScore" label="סף ציון" value={String(draftTask.minimumScore)} />
            <Field task={draftTask} k="statuses" label="סטטוסים" value={draftTask.statuses.join(', ')} />
            <Field task={draftTask} k="durationDays" label="משך סריקה" value={`${draftTask.durationDays} ימים`} />
            <Field task={draftTask} k="purchaseMode" label="מצב רכישה" value={draftTask.purchaseMode} />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs leading-relaxed text-muted">
            <b className="text-white">פקודת מקור:</b> {draftTask.rawPrompt}
          </div>
        </Section>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs text-muted">תקציב יומי</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{money(profile.dailyBudget, profile.currency)}</div>
          <div className="mt-2 text-xs text-muted">תקרת דומיין {money(profile.maxPrice, profile.currency)} · חודשי {money(profile.monthlyBudget, profile.currency)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted">הזדמנויות פעילות</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{opportunities.filter((o) => o.score >= profile.minimumScore && o.classification !== 'blocked').length}</div>
          <div className="mt-2 text-xs text-muted">עברו סף ציון {profile.minimumScore}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted">מצב רכישה פעיל</div>
          <div className="mt-1 text-2xl font-extrabold capitalize text-white">{profile.purchaseMode}</div>
          <div className="mt-2 text-xs text-muted">Auto-buy מותנה בכל בקרות הבטיחות</div>
        </div>
      </div>
    </div>
  )
}
