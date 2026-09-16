import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useStore } from './store/store'
import { money } from './engine/util'
import CommandCenter from './screens/CommandCenter'
import Results from './screens/Results'
import DomainDetails from './screens/DomainDetails'
import Compare from './screens/Compare'
import Purchases from './screens/Purchases'
import MyDomains from './screens/MyDomains'
import CheckLog from './screens/CheckLog'
import Alerts from './screens/Alerts'
import Profiles from './screens/Profiles'
import Integrations from './screens/Integrations'
import Users from './screens/Users'
import AuditLog from './screens/AuditLog'

const NAV = [
  { to: '/', label: 'מרכז חיפוש', icon: '🔎', id: '' },
  { to: '/results', label: 'לקנייה עכשיו', icon: '◇', id: '' },
  { to: '/purchases', label: 'הזמנות', icon: '🛒', id: '' },
  { to: '/my-domains', label: 'הדומיינים שלי', icon: '🌐', id: '' },
  { to: '/compare', label: 'השוואה', icon: '⇄', id: '' },
  { to: '/alerts', label: 'התראות', icon: '🔔', id: 'S-08' },
  { to: '/profiles', label: 'הגדרות', icon: '⚙', id: '' },
  { to: '/check-log', label: 'יומן בדיקות', icon: '📋', id: '' },
  { to: '/integrations', label: 'אינטגרציות', icon: '🔌', id: '' },
  { to: '/users', label: 'משתמשים', icon: '👤', id: '' },
  { to: '/audit', label: 'Audit Log', icon: '📜', id: '' },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const alerts = useStore((s) => s.alerts.filter((a) => !a.read).length)
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 right-0 z-40 w-72 transform border-l border-line bg-ink/95 p-4 backdrop-blur transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-3 px-2">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} className="h-9 w-9" alt="logo" />
          <div>
            <div className="text-sm font-extrabold leading-tight text-white">Domain Opportunity</div>
            <div className="text-[11px] tracking-wide text-brand2">ENGINE · v2.0 · לקנייה עכשיו</div>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={onClose} className={({ isActive }) => `navlink ${isActive ? 'navlink-active' : ''}`}>
              <span className="w-5 text-center text-base">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.id === 'S-08' && alerts > 0 && <span className="rounded-full bg-bad px-1.5 text-[10px] font-bold text-white">{alerts}</span>}
              <span className="text-[10px] text-line">{n.id}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 rounded-xl border border-line bg-panel2/40 p-3 text-[11px] leading-relaxed text-muted">
          דמו פונקציונלי המדמה RDAP, רשמים ומכרזים. אין רכישה אמיתית — כל הנתונים נוצרים במנוע מקומי.
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { profile, spentToday, spentMonth, currentTask } = useStore()
  const loc = useLocation()
  const title = NAV.find((n) => n.to === loc.pathname)?.label ?? 'כרטיס דומיין'
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink/80 px-4 py-3 backdrop-blur">
      <button className="btn-ghost !px-2 lg:hidden" onClick={onMenu} aria-label="תפריט">☰</button>
      <h1 className="text-base font-bold text-white">{title}</h1>
      <div className="mr-auto flex flex-wrap items-center gap-2">
        <span className="chip">פרופיל: <b className="text-white">{profile.name.split('—')[0].trim()}</b></span>
        <span className="chip">רכישה: <b className="text-white">{profile.purchaseMode === 'manual' ? 'אישור ידני' : 'אוטומטי'}</b></span>
        <span className="chip">יומי: <b className="text-white">{money(spentToday, profile.currency)}/{money(profile.dailyBudget, profile.currency)}</b></span>
        <span className="chip hidden sm:inline-flex">חודשי: <b className="text-white">{money(spentMonth, profile.currency)}/{money(profile.monthlyBudget, profile.currency)}</b></span>
      </div>
    </header>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/results" element={<Results />} />
            <Route path="/domain/:id" element={<DomainDetails />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/my-domains" element={<MyDomains />} />
            <Route path="/check-log" element={<CheckLog />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit" element={<AuditLog />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
