import { ChevronDown, RefreshCw, Search } from 'lucide-react'
import type { UserRole } from '../api'

export function TopBar({
  loading,
  role,
  searchQuery,
  userRole,
  onLogout,
  onRefresh,
  onSearchChange,
}: {
  loading: boolean
  role: string
  searchQuery: string
  userRole: UserRole
  onLogout: () => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Live backend</p>
        <h1>{role === 'Reception' ? 'Reception Dashboard' : role}</h1>
      </div>
      <div className="topbar-actions">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search"
            placeholder="Search this page..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <button className="icon-text-button" disabled={loading} type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="user-menu" type="button" onClick={onLogout}>
          <span className="avatar">{userRole.slice(0, 2).toUpperCase()}</span>
          <span>{userRole}</span>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  )
}
