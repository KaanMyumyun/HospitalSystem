import { KeyRound, LogOut, RefreshCw, Search } from 'lucide-react'
import type { UserRole } from '../api'

export function TopBar({
  loading,
  role,
  searchQuery,
  userRole,
  onChangePassword,
  onLogout,
  onRefresh,
  onSearchChange,
}: {
  loading: boolean
  role: string
  searchQuery: string
  userRole: UserRole
  onChangePassword?: () => void
  onLogout: () => void
  onRefresh: () => void
  onSearchChange?: (value: string) => void
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Live backend</p>
        <h1>{role === 'Reception' ? 'Reception Dashboard' : role}</h1>
      </div>
      <div className="topbar-actions">
        {onSearchChange && (
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search"
              placeholder="Search this page..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        )}
        <button className="icon-text-button" disabled={loading} type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <span className="user-badge">
          <span className="avatar">{userRole.slice(0, 2).toUpperCase()}</span>
          <span>{userRole}</span>
        </span>
        {onChangePassword && (
          <button className="icon-text-button" type="button" onClick={onChangePassword}>
            <KeyRound size={16} />
            Password
          </button>
        )}
        <button className="icon-text-button" type="button" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </header>
  )
}
