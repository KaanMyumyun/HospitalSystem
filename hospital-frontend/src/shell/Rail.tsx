import { getStoredSession } from '../api/client'
import type { UserRole } from '../api/client'
import { useNow } from '../app/hooks'
import type { ThemeChoice } from '../app/hooks'
import { useWorkspace } from '../app/workspaceContext'
import { clinicTimeZone } from '../lib/clinicTime'
import { mediumDate, timeOf, zoneCity } from '../lib/dates'
import { initialsOf } from '../lib/names'
import { canSee, hashFor, screenTitles } from '../lib/routes'
import { isMac } from '../lib/platform'
import { tokenUserName } from '../lib/session'
import type { Screen } from '../types'
import { IconButton } from '../ui/Button'
import { Kbd, Segmented } from '../ui/bits'
import { Icon, Mark } from '../ui/Icon'

const groups: { label: string; screens: Screen[] }[] = [
  { label: 'Front desk', screens: ['reception', 'patients'] },
  { label: 'Clinic', screens: ['doctor'] },
  { label: 'Administration', screens: ['departments', 'doctors', 'schedules', 'users', 'audit'] },
]

const roleLabels: Record<UserRole, string> = {
  Admin: 'Administrator',
  DemoAdmin: 'Admin demo',
  FrontDesk: 'Front desk',
  DemoFrontDesk: 'Reception demo',
  Doctor: 'Doctor',
  Pending: 'Waiting for a role',
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <Mark />
      <span className="wordmark-text">
        Hospital <em>System</em>
      </span>
    </span>
  )
}

export function Rail({
  screen,
  theme,
  onTheme,
  onSearch,
  onChangePassword,
  onSignOut,
  onNavigate,
}: {
  screen: Screen
  theme: ThemeChoice
  onTheme: (theme: ThemeChoice) => void
  onSearch: () => void
  onChangePassword: () => void
  onSignOut: () => void
  onNavigate?: () => void
}) {
  const { session, readOnly } = useWorkspace()
  const token = getStoredSession()?.token
  const userName = (token && tokenUserName(token)) || roleLabels[session.role]

  return (
    <div className="rail-inner">
      <div className="rail-brand">
        <Wordmark />
      </div>

      <button className="rail-search" type="button" onClick={onSearch}>
        <Icon name="search" size={16} />
        <span>Search</span>
        <span className="rail-search-keys" aria-hidden="true">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav aria-label="Main navigation" className="rail-nav">
        {groups.map((group) => {
          const visible = group.screens.filter((item) => canSee(session.role, item))
          if (visible.length === 0) return null
          return (
            <div className="rail-group" key={group.label}>
              <p className="rail-group-label">{group.label}</p>
              <ul>
                {visible.map((item) => (
                  <li key={item}>
                    <a
                      aria-current={item === screen ? 'page' : undefined}
                      className="rail-link"
                      href={hashFor(item)}
                      onClick={onNavigate}
                    >
                      {screenTitles[item]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="rail-foot">
        <ClinicClock />
        <div className="rail-account">
          <span className="avatar" aria-hidden="true">
            {initialsOf(userName)}
          </span>
          <div className="rail-account-text">
            <p className="rail-account-name">{userName}</p>
            <p className="rail-account-role">{roleLabels[session.role]}</p>
          </div>
          {!readOnly && <IconButton icon="key" label="Change password" size="sm" onClick={onChangePassword} />}
          <IconButton icon="logout" label="Sign out" size="sm" onClick={onSignOut} />
        </div>
        <Segmented
          label="Colour theme"
          options={[
            { value: 'system', label: <Icon name="monitor" size={15} />, title: 'Match the system' },
            { value: 'light', label: <Icon name="sun" size={15} />, title: 'Light' },
            { value: 'dark', label: <Icon name="moon" size={15} />, title: 'Dark' },
          ]}
          size="sm"
          value={theme}
          onChange={onTheme}
        />
      </div>
    </div>
  )
}

export function ClinicClock() {
  const now = useNow(15_000)
  const zone = clinicTimeZone()
  const local = new Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <div className="clinic-clock" title={`Every time in the app is ${zone} time`}>
      <p className="clinic-clock-time mono">{timeOf(now)}</p>
      <p className="clinic-clock-date">
        {mediumDate(now)} · <span className={zone === local ? '' : 'clinic-clock-away'}>{zoneCity(zone)}</span>
      </p>
    </div>
  )
}
