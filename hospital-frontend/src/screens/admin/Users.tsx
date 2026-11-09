import { useState } from 'react'
import { changeUserRole, createUser, getStoredSession, isDemoRole, loadUsers, resetPassword, usersPageSize } from '../../api/client'
import type { UserDto, UserRole } from '../../api/client'
import { useNow } from '../../app/hooks'
import { usePagedSearch } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { PasswordInput } from '../../components/PasswordInput'
import { timeOf } from '../../lib/dates'
import { departmentHue } from '../../lib/names'
import { tokenUserName } from '../../lib/session'
import type { ScreenProps } from '../../shell/Shell'
import { Button, readOnlyReason } from '../../ui/Button'
import { DeptDot, Empty, LoadError, Pager, Skeleton } from '../../ui/bits'
import { Dialog } from '../../ui/Dialog'
import { Field, FormError, Select } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { DemoLocked, PageHead, SearchField } from '../../ui/Page'
import './admin.css'

const assignable: UserRole[] = ['Admin', 'Doctor', 'FrontDesk']
const roleNames: Record<UserRole, string> = {
  Admin: 'Administrator',
  Doctor: 'Doctor',
  FrontDesk: 'Front desk',
  Pending: 'No role yet',
  DemoAdmin: 'Admin demo',
  DemoFrontDesk: 'Reception demo',
}

export function Users(_props: ScreenProps) {
  const { session, runBookingChange, confirm, busy } = useWorkspace()
  const allowed = session.role === 'Admin'
  const list = usePagedSearch('users', (search, page, signal) => loadUsers(search, page, signal), allowed)
  const now = useNow(30_000)
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState<UserDto | null>(null)
  const [makingDoctor, setMakingDoctor] = useState<UserDto | null>(null)
  const token = getStoredSession()?.token
  const me = token ? tokenUserName(token) : null
  const items = list.data?.items ?? []

  const changeRole = async (user: UserDto, role: UserRole) => {
    if (role === user.role) return
    if (role === 'Doctor') {
      setMakingDoctor(user)
      return
    }
    const ok = await confirm({
      eyebrow: user.userName,
      title: `Make them ${role === 'Admin' ? 'an administrator' : 'front desk'}?`,
      message:
        user.role === 'Doctor'
          ? 'They stop being a doctor and are signed out everywhere. If they have bookings ahead, you will see them first.'
          : 'They are signed out everywhere and see the new screens next time they sign in.',
      confirmLabel: 'Change role',
      tone: user.role === 'Doctor' ? 'danger' : undefined,
    })
    if (!ok) return
    await runBookingChange((cancel) => changeUserRole(user.userId, role, undefined, cancel), `${user.userName} is now ${roleNames[role].toLowerCase()}`)
  }

  if (!allowed) {
    return (
      <div className="page">
        <PageHead lede="Staff accounts and what each one can do." title="Users" />
        <div className="page-body">
          <DemoLocked title="Hidden in the demo">
            The real admin creates staff accounts here, gives them roles, and resets passwords. Demo accounts can't see
            other people's accounts.
          </DemoLocked>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHead
        actions={
          <Button icon="plus" variant="primary" onClick={() => setCreating(true)}>
            New user
          </Button>
        }
        lede="Staff accounts and what each one can do. New accounts wait without a role until you give them one."
        title="Users"
      />
      <div className="page-toolbar">
        <SearchField className="toolbar-search" label="Find a user" placeholder="Username or role" value={list.query} onChange={list.setQuery} />
      </div>
      <div className="page-body">
        {list.error && !list.data ? (
          <LoadError message={list.error} onRetry={() => void list.reload()} />
        ) : !list.data ? (
          <Skeleton lines={8} />
        ) : items.length === 0 ? (
          <Empty title={list.term ? 'No account matches that' : 'No accounts yet'}>Try part of a username or a role.</Empty>
        ) : (
          <div className={`table-wrap${list.stale || list.searching ? ' is-stale' : ''}`}>
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Role</th>
                  <th scope="col">Sign-in</th>
                  <th className="align-end" scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => {
                  const demo = isDemoRole(user.role)
                  const locked = user.lockedUntil !== null && new Date(user.lockedUntil).getTime() > now
                  const isMe = me !== null && me.toLowerCase() === user.userName.toLowerCase()
                  return (
                    <tr key={user.userId}>
                      <td>
                        <span className="account">
                          <span className="mono account-name">{user.userName}</span>
                          {isMe && <span className="tag">You</span>}
                          {user.role === 'Pending' && <span className="tag tag-amber">Needs a role</span>}
                        </span>
                      </td>
                      <td>
                        <Select
                          aria-label={`Role of ${user.userName}`}
                          className="select-sm select-inline"
                          disabled={demo || busy}
                          title={demo ? 'Demo roles are set in the database' : undefined}
                          value={user.role}
                          onChange={(event) => void changeRole(user, event.target.value as UserRole)}
                        >
                          {!assignable.includes(user.role) && (
                            <option disabled value={user.role}>
                              {roleNames[user.role]}
                            </option>
                          )}
                          {assignable.map((role) => (
                            <option key={role} value={role}>
                              {roleNames[role]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={locked ? undefined : 'signin-plain'}>
                        {locked ? (
                          <span className="tag tag-signal">
                            <Icon name="lock" size={12} />
                            Locked until {timeOf(new Date(user.lockedUntil ?? 0))}
                          </span>
                        ) : demo ? (
                          <span className="muted">Demo buttons only</span>
                        ) : (
                          <span className="muted">Password</span>
                        )}
                      </td>
                      <td className="align-end">
                        <Button
                          disabled={demo}
                          icon="key"
                          size="sm"
                          title={demo ? readOnlyReason : undefined}
                          variant="ghost"
                          onClick={() => setResetting(user)}
                        >
                          {locked ? 'Reset and unlock' : 'Reset password'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <Pager
            hasNextPage={list.data.hasNextPage}
            loading={list.loading || list.stale || list.searching}
            noun="users"
            page={list.page}
            pageSize={usersPageSize}
            shown={items.length}
            onPage={list.setPage}
          />
        )}
      </div>
      {creating && <NewUserDialog onClose={() => setCreating(false)} />}
      {resetting && <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
      {makingDoctor && (
        <MakeDoctorDialog
          user={makingDoctor}
          onClose={() => setMakingDoctor(null)}
          onConfirm={async (departmentId) => {
            const outcome = await runBookingChange(
              (cancel) => changeUserRole(makingDoctor.userId, 'Doctor', departmentId, cancel),
              `${makingDoctor.userName} is now a doctor`,
            )
            if (outcome.ok) setMakingDoctor(null)
          }}
        />
      )}
    </div>
  )
}

const namePattern = /^[A-Za-z][A-Za-z0-9._-]*$/

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const { run, busy } = useWorkspace()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()
  const nameProblem =
    trimmed.length < 3
      ? 'Use at least 3 characters'
      : trimmed.length > 50
        ? 'Use 50 characters or fewer'
        : !namePattern.test(trimmed)
          ? 'Start with a letter; then letters, numbers, dots, hyphens or underscores'
          : null
  const passwordProblem = password.length < 8 ? 'Use at least 8 characters' : null

  const submit = async () => {
    setTried(true)
    if (nameProblem || passwordProblem) return
    const outcome = await run(() => createUser(trimmed, password), `${trimmed} created. Give them a role next.`, { quiet: true })
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <Dialog
      description="The account can't see anything until you give it a role in the list."
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit" variant="primary">
            Create account
          </Button>
        </>
      }
      size="sm"
      title="New user"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field error={tried ? nameProblem : null} hint="Usernames ignore case: Anna and anna are the same account." label="Username">
        {(control) => (
          <input
            {...control}
            autoCapitalize="none"
            autoComplete="off"
            className="input mono-input"
            maxLength={50}
            placeholder="anna.ivanova"
            spellCheck={false}
            value={name}
            onChange={(event) => {
              setError(null)
              setName(event.target.value)
            }}
          />
        )}
      </Field>
      <Field error={tried ? passwordProblem : null} hint="At least 8 characters. Share it with them in person." label="First password">
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setError(null)
              setPassword(value)
            }}
          />
        )}
      </Field>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: UserDto; onClose: () => void }) {
  const { run, busy, confirm } = useWorkspace()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const problem = password.length < 8 ? 'Use at least 8 characters' : null
  const mismatch = repeat !== password ? 'The two passwords differ' : null

  const submit = async () => {
    setTried(true)
    if (problem || mismatch) return
    const ok = await confirm({
      eyebrow: user.userName,
      title: 'Set this password?',
      message: 'They are signed out everywhere, and any sign-in lock is lifted.',
      confirmLabel: 'Set password',
    })
    if (!ok) return
    const outcome = await run(() => resetPassword(user.userId, password), `New password set for ${user.userName}`, { quiet: true })
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <Dialog
      dismissOnBackdrop={false}
      eyebrow={user.userName}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit" variant="primary">
            Set password
          </Button>
        </>
      }
      size="sm"
      title="Reset password"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field error={tried ? problem : null} hint="At least 8 characters." label="New password">
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setError(null)
              setPassword(value)
            }}
          />
        )}
      </Field>
      <Field error={tried ? mismatch : null} label="Repeat it">
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={repeat}
            onChange={(value) => {
              setError(null)
              setRepeat(value)
            }}
          />
        )}
      </Field>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}

function MakeDoctorDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: UserDto
  onClose: () => void
  onConfirm: (departmentId: number) => Promise<void>
}) {
  const { data, busy } = useWorkspace()
  const open = data.departments.filter((department) => department.isActive).sort((left, right) => left.name.localeCompare(right.name))
  const [departmentId, setDepartmentId] = useState<number | null>(open[0]?.id ?? null)

  return (
    <Dialog
      description="They are signed out everywhere and sign back in to their own day view. Give them working hours under Schedules so they can be booked."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} disabled={departmentId === null} type="submit" variant="primary">
            Make doctor
          </Button>
        </>
      }
      size="sm"
      title={`Make ${user.userName} a doctor`}
      onClose={onClose}
      onSubmit={() => {
        if (departmentId !== null) void onConfirm(departmentId)
      }}
    >
      {open.length === 0 ? (
        <FormError>No department is open. Create or open one under Departments first.</FormError>
      ) : (
        <fieldset className="choice-list">
          <legend className="field-label">Department</legend>
          {open.map((department) => (
            <label className="choice" key={department.id}>
              <input
                checked={department.id === departmentId}
                className="choice-input"
                name="doctor-department"
                type="radio"
                value={department.id}
                onChange={() => setDepartmentId(department.id)}
              />
              <DeptDot hue={departmentHue(department.id)} size={10} />
              <span className="choice-label">{department.name}</span>
              <span className="choice-check" aria-hidden="true">
                <Icon name="check" size={15} />
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </Dialog>
  )
}
