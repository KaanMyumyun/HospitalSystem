import { Activity, CalendarDays, Clock3, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react'
import type { Screen } from '../types'

export function Sidebar({
  canUseAdmin,
  canUseReception,
  screen,
  onChange,
}: {
  canUseAdmin: boolean
  canUseReception: boolean
  screen: Screen
  onChange: (screen: Screen) => void
}) {
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
        {canUseReception && (
          <button
            className={`nav-item ${screen === 'reception' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('reception')}
          >
            <CalendarDays size={18} />
            Reception
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'departments' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('departments')}
          >
            <ShieldCheck size={18} />
            Departments
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'doctors' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('doctors')}
          >
            <Stethoscope size={18} />
            Doctors
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'schedules' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('schedules')}
          >
            <Clock3 size={18} />
            Schedules
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'users' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('users')}
          >
            <UsersRound size={18} />
            Users
          </button>
        )}
      </nav>
    </aside>
  )
}
