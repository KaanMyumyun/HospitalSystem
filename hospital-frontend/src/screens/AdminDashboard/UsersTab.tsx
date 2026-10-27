import { useState } from 'react'
import { isDemoRole } from '../../api'
import type { UserDto, UserRole, UsersPage } from '../../api'
import { Pager } from '../../components/Pager'
import { GuardedButton, StatusBadge, TableStatus } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { guarded } from '../../lib/readOnly'
import { formatTime } from '../../lib/format'
import type { ActionOutcome } from '../../types'

// Demo roles are never assigned from the app; accounts get them in the database.
const assignableRoles: UserRole[] = ['Admin', 'Doctor', 'FrontDesk']

// The API searches, sorts and pages the users; this tab shows one page.
export function UsersTab({
  usersPage,
  loading,
  onChangeUserRole,
  onCreateUser,
  onPageChange,
  onResetPassword,
}: {
  usersPage: UsersPage | null
  // The shared loading flag, or the users page loading.
  loading: boolean
  onChangeUserRole: (user: UserDto, role: UserRole) => Promise<ActionOutcome>
  onCreateUser: (name: string, password: string) => Promise<ActionOutcome>
  onPageChange: (page: number) => void
  onResetPassword: (user: UserDto, password: string) => Promise<ActionOutcome>
}) {
  const { isReadOnly } = useWorkspace()
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')

  const visibleUsers = usersPage?.items ?? []

  return (
    <>
      <div className="inline-form">
        <input
          aria-label="New username"
          autoComplete="off"
          placeholder="Username"
          value={newUserName}
          onChange={(event) => setNewUserName(event.target.value)}
        />
        <input
          aria-label="New user's password"
          autoComplete="new-password"
          placeholder="Password"
          type="password"
          value={newUserPassword}
          onChange={(event) => setNewUserPassword(event.target.value)}
        />
        <GuardedButton
          className="secondary-button"
          readOnly={isReadOnly}
          disabled={!newUserName.trim() || newUserPassword.length < 8 || loading}
          onClick={async () => {
            if (!(await onCreateUser(newUserName, newUserPassword)).ok) return
            setNewUserName('')
            setNewUserPassword('')
          }}
        >
          Create User
        </GuardedButton>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Reset Password</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((user) => {
            // Demo accounts are managed in the database, not here.
            const locked = isReadOnly || isDemoRole(user.role)
            return (
              <tr key={user.userId}>
                <td>
                  <div className="cell-stack">
                    <strong>{user.userName}</strong>
                    {user.lockedUntil && (
                      <StatusBadge tone="danger">Locked until {formatTime(new Date(user.lockedUntil))}</StatusBadge>
                    )}
                  </div>
                </td>
                <td>
                  <select
                    aria-label={`Role of ${user.userName}`}
                    className="table-select"
                    {...guarded(locked, loading)}
                    value={user.role}
                    onChange={(event) => void onChangeUserRole(user, event.target.value as UserRole)}
                  >
                    {!assignableRoles.includes(user.role) && (
                      <option disabled value={user.role}>
                        {user.role}
                      </option>
                    )}
                    {assignableRoles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {resetUserId === user.userId ? (
                    <div className="cell-stack">
                      <div className="inline-form compact-inline">
                        <input
                          aria-label={`New password for ${user.userName}`}
                          autoComplete="new-password"
                          minLength={8}
                          type="password"
                          value={resetPasswordValue}
                          onChange={(event) => setResetPasswordValue(event.target.value)}
                        />
                        <GuardedButton
                          className="secondary-button compact-action"
                          readOnly={locked}
                          disabled={resetPasswordValue.length < 8 || loading}
                          onClick={async () => {
                            if (!(await onResetPassword(user, resetPasswordValue)).ok) return
                            setResetUserId(null)
                            setResetPasswordValue('')
                          }}
                        >
                          Save
                        </GuardedButton>
                      </div>
                      {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
                        <small>Password must be at least 8 characters long.</small>
                      )}
                    </div>
                  ) : (
                    <GuardedButton
                      className="secondary-button compact-action"
                      readOnly={locked}
                      onClick={() => setResetUserId(user.userId)}
                    >
                      Reset
                    </GuardedButton>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <TableStatus
        loading={loading}
        rows={6}
        empty={visibleUsers.length === 0}
        emptyText={isReadOnly ? 'User accounts are hidden from demo accounts.' : 'No users found.'}
      />
      <Pager page={usersPage} loading={loading} noun="users" onPageChange={onPageChange} />
    </>
  )
}
