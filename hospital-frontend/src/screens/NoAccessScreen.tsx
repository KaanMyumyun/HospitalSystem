import { Activity } from 'lucide-react'
import type { UserRole } from '../api'

type NoAccessScreenProps = {
  role: UserRole
  onLogout: () => void
}

export function NoAccessScreen({ role, onLogout }: NoAccessScreenProps) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand compact-brand">
          <div className="brand-mark">
            <Activity size={20} />
          </div>
          <div>
            <strong>Hospital System</strong>
            <span>Staff operations</span>
          </div>
        </div>

        <div className="login-heading">
          <p className="eyebrow">{role}</p>
          <h1>No access for this role</h1>
          <p>There are no screens for your role yet. Ask an admin if you need access.</p>
        </div>

        <button className="primary-button" type="button" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </main>
  )
}
