import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Contact,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import type { Screen } from '../types'

type Item = { screen: Screen; label: string; icon: LucideIcon }

const receptionItems: Item[] = [
  { screen: 'reception', label: 'Reception', icon: CalendarDays },
  { screen: 'patients', label: 'Patients', icon: Contact },
]
const doctorItems: Item[] = [{ screen: 'doctor', label: 'My day', icon: CalendarCheck }]
const adminItems: Item[] = [
  { screen: 'departments', label: 'Departments', icon: ShieldCheck },
  { screen: 'doctors', label: 'Doctors', icon: Stethoscope },
  { screen: 'schedules', label: 'Schedules', icon: Clock3 },
  { screen: 'users', label: 'Users', icon: UsersRound },
  { screen: 'audit', label: 'Audit log', icon: ScrollText },
]

export function Sidebar({
  canUseAdmin,
  canUseReception,
  canUseDoctor,
  screen,
  onChange,
}: {
  canUseAdmin: boolean
  canUseReception: boolean
  canUseDoctor: boolean
  screen: Screen
  onChange: (screen: Screen) => void
}) {
  const items = [
    ...(canUseReception ? receptionItems : []),
    ...(canUseDoctor ? doctorItems : []),
    ...(canUseAdmin ? adminItems : []),
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Activity size={20} />
        </div>
        <div>
          <strong>Hospital System</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {items.map(({ screen: target, label, icon: Icon }) => (
          <button
            className={`nav-item ${screen === target ? 'active' : ''}`}
            key={target}
            type="button"
            onClick={() => onChange(target)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
