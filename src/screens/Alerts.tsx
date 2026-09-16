import { useEffect } from 'react'
import { useStore } from '../store/store'
import { Section, Empty } from '../components/ui'
import { timeAgo } from '../engine/util'

const channelIcon: Record<string, string> = { email: '✉', whatsapp: '🟢', inapp: '🔔' }

export default function Alerts() {
  const { alerts, markAlertsRead } = useStore()
  useEffect(() => { const t = setTimeout(markAlertsRead, 1200); return () => clearTimeout(t) }, [markAlertsRead])

  if (!alerts.length) return <Section title="התראות" sub="דוא״ל, WhatsApp והתראות באתר · מניעת כפילויות"><Empty>אין התראות עדיין.</Empty></Section>

  return (
    <Section title={`התראות · ${alerts.length}`} sub="שינוי סטטוס משמעותי מפיק התראה אחת ללא כפילויות">
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${a.read ? 'border-line bg-panel2/30' : 'border-brand/40 bg-brand/5'}`}>
            <span className="text-lg">{channelIcon[a.channel]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{a.title}</span>
                {!a.read && <span className="h-2 w-2 rounded-full bg-brand2" />}
                <span className="mr-auto text-xs text-muted">{timeAgo(a.at)}</span>
              </div>
              <div className="text-sm text-muted" dir="ltr">{a.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
