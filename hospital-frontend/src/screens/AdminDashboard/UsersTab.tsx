import { useState } from 'react'
import type { UserDto, UserRole } from '../../api'
import { EmptyState, SkeletonRows } from '../../components/ui'

export function UsersTab({
  users,
  loading,
  searchQuery,
  isReadOnly,
  onChangeUserRole,
  onCreateUser,
  onResetPassword,
}: {
  users: UserDto[]
  loading: boolean
  searchQuery: string
  isReadOnly: boolean
  onChangeUserRole: (userId: number, role: UserRole) => Promise<void>
  onCreateUser: (name: string, password: string) => Promise<void>
  onResetPassword: (userId: number, password: string) => Promise<void>
}) {
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleUsers = users.filter(
    (user) =>
      !normalizedSearch ||
      user.userName.toLowerCase().includes(normalizedSearch) ||
      user.role.toLowerCase().includes(normalizedSearch),
  )

  return (
    <>
      <div className="inline-form">
        <input placeholder="Username" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
        <input type="password" placeholder="Password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
        <button
          className="secondary-button"
          disabled={!newUserName.trim() || newUserPassword.length < 8 || isReadOnly}
          title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
          type="button"
          onClick={() => {
            void onCreateUser(newUserName, newUserPassword)
            setNewUserName('')
            setNewUserPassword('')
          }}
        >
          Create User
        </button>
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
          {visibleUsers.map((user) => (
            <tr key={user.userId}>
              <td><strong>{user.userName}</strong></td>
              <td>
                <select
                  className="table-select"
                  disabled={isReadOnly || user.role.startsWith('Demo')}
                  title={isReadOnly || user.role.startsWith('Demo') ? 'Demo accounts are read-only.' : undefined}
                  value={user.role}
                  onChange={(event) => void onChangeUserRole(user.userId, event.target.value as UserRole)}
                >
                  {['Admin', 'Doctor', 'FrontDesk', 'DemoAdmin', 'DemoFrontDesk'].map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </td>
              <td>
                {resetUserId === user.userId ? (
                  <div className="cell-stack">
                    <div className="inline-form compact-inline">
                      <input
                        minLength={8}
                        type="password"
                        value={resetPasswordValue}
                        onChange={(event) => {
                          setResetPasswordError(null)
                          setResetPasswordValue(event.target.value)
                        }}
                      />
                      <button
                        className="secondary-button compact-action"
                        disabled={resetPasswordValue.length < 8 || isReadOnly || user.role.startsWith('Demo')}
                        title={isReadOnly || user.role.startsWith('Demo') ? 'Demo accounts are read-only.' : undefined}
                        type="button"
                        onClick={() => {
                          if (resetPasswordValue.length < 8) {
                            setResetPasswordError('Password must be at least 8 characters long')
                            return
                          }
                          void onResetPassword(user.userId, resetPasswordValue)
                          setResetUserId(null)
                          setResetPasswordValue('')
                          setResetPasswordError(null)
                        }}
                      >
                        Save
                      </button>
                    </div>
                    {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
                      <small>Password must be at least 8 characters long.</small>
                    )}
                  </div>
                ) : (
                  <button
                    className="secondary-button compact-action"
                    disabled={isReadOnly || user.role.startsWith('Demo')}
                    title={isReadOnly || user.role.startsWith('Demo') ? 'Demo accounts are read-only.' : undefined}
                    type="button"
                    onClick={() => {
                      setResetPasswordError(null)
                      setResetUserId(user.userId)
                    }}
                  >
                    Reset
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <SkeletonRows count={6} />}
      {!loading && visibleUsers.length === 0 && <EmptyState text="No users found." />}
      {resetPasswordError && <div className="form-error inline-error">{resetPasswordError}</div>}
    </>
  )
}
