import { useState } from 'react'
import type { UserRole, UsersPage } from '../../api'
import { EmptyState, SkeletonRows } from '../../components/ui'
import type { ActionOutcome } from '../../types'

// Demo roles are never assigned from the app; accounts get them in the database.
const assignableRoles: UserRole[] = ['Admin', 'Doctor', 'FrontDesk']

// The API searches, sorts and pages the users; this tab shows one page.
export function UsersTab({
  usersPage,
  loading,
  isReadOnly,
  onChangeUserRole,
  onCreateUser,
  onPageChange,
  onResetPassword,
}: {
  usersPage: UsersPage | null
  loading: boolean
  isReadOnly: boolean
  onChangeUserRole: (userId: number, role: UserRole) => Promise<ActionOutcome>
  onCreateUser: (name: string, password: string) => Promise<ActionOutcome>
  onPageChange: (page: number) => void
  onResetPassword: (userId: number, password: string) => Promise<ActionOutcome>
}) {
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')

  const visibleUsers = usersPage?.items ?? []

  return (
    <>
      <div className="inline-form">
        <input placeholder="Username" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
        <input type="password" placeholder="Password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
        <button
          className="secondary-button"
          disabled={!newUserName.trim() || newUserPassword.length < 8 || isReadOnly || loading}
          title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
          type="button"
          onClick={async () => {
            if (!(await onCreateUser(newUserName, newUserPassword)).ok) return
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
                  disabled={isReadOnly || user.role.startsWith('Demo') || loading}
                  title={isReadOnly || user.role.startsWith('Demo') ? 'Demo accounts are read-only.' : undefined}
                  value={user.role}
                  onChange={(event) => void onChangeUserRole(user.userId, event.target.value as UserRole)}
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
                        minLength={8}
                        type="password"
                        value={resetPasswordValue}
                        onChange={(event) => setResetPasswordValue(event.target.value)}
                      />
                      <button
                        className="secondary-button compact-action"
                        disabled={resetPasswordValue.length < 8 || isReadOnly || user.role.startsWith('Demo') || loading}
                        title={isReadOnly || user.role.startsWith('Demo') ? 'Demo accounts are read-only.' : undefined}
                        type="button"
                        onClick={async () => {
                          if (!(await onResetPassword(user.userId, resetPasswordValue)).ok) return
                          setResetUserId(null)
                          setResetPasswordValue('')
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
                    onClick={() => setResetUserId(user.userId)}
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
      {!loading && visibleUsers.length === 0 && (
        <EmptyState text={isReadOnly ? 'User accounts are hidden from demo accounts.' : 'No users found.'} />
      )}
      {usersPage && usersPage.totalCount > usersPage.pageSize && (
        <UsersPager usersPage={usersPage} loading={loading} onPageChange={onPageChange} />
      )}
    </>
  )
}

function UsersPager({
  usersPage,
  loading,
  onPageChange,
}: {
  usersPage: UsersPage
  loading: boolean
  onPageChange: (page: number) => void
}) {
  const { items, page, pageSize, totalCount } = usersPage
  const first = (page - 1) * pageSize + 1
  const last = (page - 1) * pageSize + items.length

  return (
    <div className="toolbar pager">
      <span className="subtle">{items.length > 0 ? `${first}-${last} of ${totalCount}` : `${totalCount} users`}</span>
      <div className="pager-buttons">
        <button className="secondary-button" disabled={page <= 1 || loading} type="button" onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={page * pageSize >= totalCount || loading}
          type="button"
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
