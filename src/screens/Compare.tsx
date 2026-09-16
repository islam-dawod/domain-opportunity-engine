import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { Section, Empty, PurchaseTypePill, ClassBadge } from '../components/ui'
import { money } from '../engine/util'

export default function Compare() {
  const { opportunities } = useStore()
  const pool = opportunities.slice(0, 40)
  const [sel, setSel] = useState<string[]>(() => pool.slice(0, 3).map((o) => o.id))

  if (!pool.length) return <Section title="השוואה"><Empty>אין דומיינים להשוואה. <Link to="/" className="text-brand2">התחל בדיקה</Link></Empty></Section>

  const chosen = sel.map((id) => pool.find((o) => o.id === id)!).filter(Boolean)
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s))

  const rows: [string, (o: (typeof pool)[number]) => React.ReactNode][] = [
    ['ציון', (o) => <b className="text-white">{o.score}</b>],
    ['שלמות נתונים', (o) => `${o.confidence}%`],
    ['סיווג', (o) => <ClassBadge c={o.classification} />],
    ['סוג רכישה', (o) => <PurchaseTypePill type={o.purchaseType} />],
    ['מחיר כולל', (o) => money(o.price.total, o.price.currency)],
    ['חידוש', (o) => money(o.price.renewalPrice, o.price.currency)],
    ['אורך', (o) => `${o.sld.length} תווים`],
    ['וותק', (o) => (o.ageYears ? `${o.ageYears} שנים` : '—')],
    ['Ref. domains', (o) => (o.referringDomains ? o.referringDomains.toLocaleString() : 'חסר')],
    ['סיכונים', (o) => o.risks.length],
  ]

  return (
    <div className="space-y-5">
      <Section title="בחירת דומיינים" sub="עד 5 דומיינים להשוואה זה לצד זה">
        <div className="flex flex-wrap gap-2">
          {pool.map((o) => <button key={o.id} onClick={() => toggle(o.id)} className={`chip ${sel.includes(o.id) ? '!border-brand !text-white !bg-brand/15' : ''}`} dir="ltr">{o.domain} · {o.score}</button>)}
        </div>
      </Section>

      <Section title={`השוואה · ${chosen.length}`}>
        {chosen.length === 0 ? <Empty>בחר דומיינים למעלה.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead><tr><th className="th sticky right-0 bg-panel">מדד</th>{chosen.map((o) => <th key={o.id} className="th text-center"><Link to={`/domain/${o.id}`} className="text-white hover:text-brand2" dir="ltr">{o.domain}</Link></th>)}</tr></thead>
              <tbody>
                {rows.map(([label, render], i) => (
                  <tr key={label} className={i % 2 ? 'bg-panel2/30' : ''}>
                    <td className="td sticky right-0 bg-panel font-semibold text-muted">{label}</td>
                    {chosen.map((o) => <td key={o.id} className="td text-center">{render(o)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
