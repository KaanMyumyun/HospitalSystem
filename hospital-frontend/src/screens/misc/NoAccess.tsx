import type { UserRole } from '../../api/client'
import { Wordmark } from '../../shell/Rail'
import { Button } from '../../ui/Button'
import '../signin/signin.css'

export function NoAccess({ role, onSignOut }: { role: UserRole; onSignOut: () => void }) {
  return (
    <main className="center-page">
      <div className="center-card">
        <Wordmark />
        <h1 className="center-title">{role === 'Pending' ? 'Your account is waiting for a role' : 'Nothing here for your role yet'}</h1>
        <p className="center-text">
          An administrator decides which screens each account can use. Once they have given you a role, sign in again.
        </p>
        <Button icon="logout" variant="primary" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </main>
  )
}
