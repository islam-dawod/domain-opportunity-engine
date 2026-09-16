import { useStore } from '../store/store'
import { Section } from '../components/ui'

export default function Integrations() {
  const { integrations } = useStore()
  return (
    <Section title="אינטגרציות (S-10)" sub="רשמים, ספקי מידע, WhatsApp ודוא״ל. כל אינטגרציה מיושמת כ-Adapter ניתן להחלפה; סודות נשמרים בכספת מוצפנת.">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((it) => (
          <div key={it.name} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white" dir="ltr">{it.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${it.connected ? 'text-good border-good/40 bg-good/10' : 'text-muted border-line bg-panel2/60'}`}>
                {it.connected ? 'מחובר' : 'לא מחובר'}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">{it.category}</div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
              <span>{it.note}</span>
              <button className="btn-ghost !px-2 !py-1 text-[11px]">{it.connected ? 'בדוק חיבור' : 'חבר'}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-line bg-panel2/40 p-3 text-xs leading-relaxed text-muted">
        המלצה לגרסה ראשונה: לפחות שני רשמים — אחד לבדיקת זמינות/רישום ואחד בעל מאגר Expired/Closeout — לצמצום תלות בספק יחיד.
        אין שמירת פרטי כרטיס במערכת; יכולת רכישה נבדקת מול יתרת הרשם בלבד.
      </div>
    </Section>
  )
}
