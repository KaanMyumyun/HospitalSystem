import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AffectedBookingsError,
  canListUsers,
  cancelAppointment,
  changeAppointmentStatus,
  changeDepartmentStatus,
  changeDoctorDepartment,
  changeDoctorStatus,
  changeOwnPassword,
  changeSchedule,
  changeUserRole,
  clearSession,
  createAppointment,
  createDepartment,
  createSchedule,
  createUser,
  getStoredSession,
  loadHospitalData,
  PossiblePatientMatchError,
  resetPassword,
  sessionExpiredEvent,
  updatePatient,
} from './api'
import type { CancelAffected, UserRole } from './api'
import './App.css'
import { AffectedBookingsDialog } from './components/AffectedBookingsDialog'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useUsersPage } from './hooks/useUsersPage'
import { useWeekAppointments } from './hooks/useWeekAppointments'
import { adminTitle, confirmAction } from './lib/format'
import { AdminDashboard } from './screens/AdminDashboard'
import { DoctorDashboard } from './screens/DoctorDashboard'
import { LoginScreen } from './screens/LoginScreen'
import { NoAccessScreen } from './screens/NoAccessScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { PatientsScreen } from './screens/PatientsScreen'
import { ReceptionDashboard } from './screens/ReceptionDashboard'
import type { ActionOutcome, ActivityEntry, HospitalData, Screen, Session } from './types'

const emptyData: HospitalData = {
  departments: [],
  doctors: [],
  schedules: [],
}
const activityStorageKey = 'hospital-frontend-activity'

function canUseAdmin(role: UserRole) {
  return role === 'Admin' || role === 'DemoAdmin'
}

function canUseReception(role: UserRole) {
  return role === 'FrontDesk' || role === 'DemoFrontDesk'
}

function canUseDoctor(role: UserRole) {
  return role === 'Doctor'
}

// Admin and reception screens share the departments, doctors and schedules.
function usesHospitalData(role: UserRole) {
  return canUseAdmin(role) || canUseReception(role)
}

function initialScreen(role: UserRole): Screen {
  if (canUseAdmin(role)) return 'departments'
  if (canUseDoctor(role)) return 'doctor'
  return 'reception'
}

function screenTitle(screen: Screen) {
  if (screen === 'reception') return 'Reception'
  if (screen === 'patients') return 'Patients'
  if (screen === 'doctor') return 'My day'
  return adminTitle(screen)
}

// A change the API refused because it strands future bookings, waiting for
// the admin to cancel them with a reason or keep things as they are.
type PendingChange = {
  affected: AffectedBookingsError
  confirm: (reason: string) => Promise<ActionOutcome>
  dismiss: () => void
}

function App() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession())
  const [screen, setScreen] = useState<Screen>(() => {
    const stored = getStoredSession()
    return stored ? initialScreen(stored.role) : 'reception'
  })
  const [data, setData] = useState<HospitalData>(emptyData)
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [loading, setLoading] = useState(() => session !== null && usesHospitalData(session.role))
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>(() => {
    const raw = localStorage.getItem(activityStorageKey)
    if (!raw) return []
    try {
      return JSON.parse(raw) as ActivityEntry[]
    } catch {
      return []
    }
  })

  const selectedDoctor =
    data.doctors.find((doctor) => doctor.doctorId === selectedDoctorId) ??
    data.doctors.find((doctor) => doctor.isActive) ??
    null
  const { appointments, reload: reloadAppointments } = useWeekAppointments(
    session && canUseReception(session.role) ? (selectedDoctor?.doctorId ?? null) : null,
    weekOffset,
    setError,
  )
  const {
    usersPage,
    isLoading: usersLoading,
    setPage: setUsersPage,
    reload: reloadUsers,
  } = useUsersPage(session !== null && canListUsers(session.role) && screen === 'users', searchQuery, setError)

  const refresh = useCallback(() => {
    if (!session || !usesHospitalData(session.role)) return

    return loadHospitalData()
      .then((nextData) => {
        setData(nextData)
        setSelectedDoctorId((current) => current ?? nextData.doctors.find((doctor) => doctor.isActive)?.doctorId ?? null)
        setSelectedDepartmentId((current) => current ?? nextData.departments[0]?.id ?? null)
      })
      .catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Failed to load backend data')
      })
      .finally(() => setLoading(false))
  }, [session])

  // Everything on screen: the shared lists, plus the visible week or users page.
  const reloadAll = useCallback(async () => {
    if (!session || !usesHospitalData(session.role)) return

    setLoading(true)
    setError(null)
    await Promise.all([refresh(), reloadAppointments(), reloadUsers()])
  }, [session, refresh, reloadAppointments, reloadUsers])

  const actionInFlight = useRef(false)

  const runAction = async (action: () => Promise<unknown>, successMessage: string): Promise<ActionOutcome> => {
    if (session?.role.startsWith('Demo')) {
      const message = 'Not allowed to do that. Demo accounts are read-only.'
      setError(message)
      setNotice(null)
      return { ok: false, error: message }
    }

    if (actionInFlight.current) return { ok: false }
    actionInFlight.current = true

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      await reloadAll()
      setNotice(successMessage)
      setActivity((current) =>
        [{ id: crypto.randomUUID(), message: successMessage, at: new Date().toISOString() }, ...current].slice(0, 8),
      )
      return { ok: true }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Operation failed'
      // These open a dialog of their own instead.
      if (!(actionError instanceof PossiblePatientMatchError || actionError instanceof AffectedBookingsError)) {
        setError(message)
      }
      return { ok: false, error: message, cause: actionError }
    } finally {
      actionInFlight.current = false
      setLoading(false)
    }
  }

  // A change that can strand future bookings. When the API refuses it, the
  // admin sees the bookings and decides; the outcome is that decision's.
  const runBookingChange = async (
    change: (cancel?: CancelAffected) => Promise<unknown>,
    successMessage: string,
  ): Promise<ActionOutcome> => {
    const outcome = await runAction(() => change(), successMessage)
    if (outcome.ok || !(outcome.cause instanceof AffectedBookingsError)) return outcome

    const affected = outcome.cause
    return new Promise<ActionOutcome>((resolve) => {
      const finish = (result: ActionOutcome) => {
        setPendingChange(null)
        resolve(result)
      }
      setPendingChange({
        affected,
        confirm: async (reason) => {
          const retried = await runAction(
            () => change({ cancelAffectedAppointments: true, cancellationReason: reason }),
            successMessage,
          )
          if (retried.ok) finish(retried)
          else if (retried.cause instanceof AffectedBookingsError) {
            // More bookings were made meanwhile; show the new list.
            const latest = retried.cause
            setPendingChange((current) => current && { ...current, affected: latest })
          }
          return retried
        },
        dismiss: () => finish({ ok: false }),
      })
    })
  }

  useEffect(() => {
    localStorage.setItem(activityStorageKey, JSON.stringify(activity))
  }, [activity])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleFocus = () => {
      void reloadAll()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [reloadAll])

  useEffect(() => {
    const handleSessionExpired = () => {
      setSession(null)
      setLoading(false)
      setActivity([])
      setData(emptyData)
      setSelectedDoctorId(null)
      setWeekOffset(0)
      setSelectedDepartmentId(null)
      setPendingChange(null)
      setChangingPassword(false)
    }

    window.addEventListener(sessionExpiredEvent, handleSessionExpired)
    return () => window.removeEventListener(sessionExpiredEvent, handleSessionExpired)
  }, [])

  const handleLogin = (nextSession: Session) => {
    setSession(nextSession)
    setLoading(usesHospitalData(nextSession.role))
    setError(null)
    setActivity([])
    setScreen(initialScreen(nextSession.role))
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setLoading(false)
    setActivity([])
    setData(emptyData)
    setSelectedDoctorId(null)
    setWeekOffset(0)
    setSelectedDepartmentId(null)
    setPendingChange(null)
    setChangingPassword(false)
  }

  const pathname = window.location.pathname
  if (pathname !== '/' && pathname !== '') {
    return <NotFoundScreen />
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (!usesHospitalData(session.role) && !canUseDoctor(session.role)) {
    return <NoAccessScreen role={session.role} onLogout={handleLogout} />
  }

  const isReadOnly = session.role.startsWith('Demo')
  const selectedDepartment =
    data.departments.find((department) => department.id === selectedDepartmentId) ?? data.departments[0] ?? null
  const markAppointment = (appointmentId: number, status: 'Completed' | 'NoShow') =>
    runAction(
      () => changeAppointmentStatus(appointmentId, status),
      status === 'Completed' ? 'Appointment marked completed' : 'Appointment marked no-show',
    )

  return (
    <div className="app-shell">
      <Sidebar
        canUseAdmin={canUseAdmin(session.role)}
        canUseReception={canUseReception(session.role)}
        canUseDoctor={canUseDoctor(session.role)}
        screen={screen}
        onChange={setScreen}
      />
      <main className="workspace">
        <TopBar
          loading={loading}
          role={screenTitle(screen)}
          userRole={session.role}
          searchQuery={searchQuery}
          onChangePassword={isReadOnly ? undefined : () => setChangingPassword(true)}
          onLogout={handleLogout}
          onRefresh={reloadAll}
          onSearchChange={setSearchQuery}
        />

        {(error || notice) && (
          <div className="alert-stack">
            {error && (
              <div className="app-alert" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="app-alert success" role="status">
                {notice}
              </div>
            )}
          </div>
        )}

        {screen === 'reception' && (
          <ReceptionDashboard
            appointments={appointments}
            departments={data.departments}
            doctors={data.doctors}
            loading={loading}
            schedules={data.schedules}
            selectedDoctor={selectedDoctor}
            selectedDoctorId={selectedDoctorId}
            searchQuery={searchQuery}
            weekOffset={weekOffset}
            isReadOnly={isReadOnly}
            onSelectDoctor={setSelectedDoctorId}
            onWeekOffsetChange={setWeekOffset}
            onCancelAppointment={(appointmentId, reason) =>
              runAction(
                () => cancelAppointment({ appointmentId, reason }),
                'Appointment cancelled',
              )
            }
            onChangeAppointmentStatus={markAppointment}
            onCreateAppointment={(input) => runAction(() => createAppointment(input), 'Appointment booked')}
          />
        )}

        {screen === 'patients' && (
          <PatientsScreen
            searchQuery={searchQuery}
            isReadOnly={isReadOnly}
            loading={loading}
            onError={setError}
            onUpdatePatient={(input) => runAction(() => updatePatient(input), 'Patient details saved')}
          />
        )}

        {screen === 'doctor' && (
          <DoctorDashboard loading={loading} onError={setError} onChangeAppointmentStatus={markAppointment} />
        )}

        {canUseAdmin(session.role) && screen !== 'reception' && screen !== 'patients' && screen !== 'doctor' && (
          <AdminDashboard
            departments={data.departments}
            doctors={data.doctors}
            loading={loading}
            schedules={data.schedules}
            selectedDepartment={selectedDepartment}
            selectedDepartmentId={selectedDepartmentId}
            section={screen}
            searchQuery={searchQuery}
            isReadOnly={isReadOnly}
            activity={activity}
            usersPage={usersPage}
            usersLoading={usersLoading}
            canReadAuditLog={session.role === 'Admin'}
            onError={setError}
            onNavigate={setScreen}
            onUsersPageChange={setUsersPage}
            onSelectDepartment={setSelectedDepartmentId}
            onAssignDoctor={async (doctorId, departmentId) => {
              if (!confirmAction('Assign doctor to this department?')) return { ok: false }
              return runAction(() => changeDoctorDepartment(doctorId, departmentId), 'Doctor department updated')
            }}
            onChangeDepartmentStatus={async (departmentId, isActive) => {
              if (!confirmAction(`${isActive ? 'Activate' : 'Deactivate'} this department?`)) return { ok: false }
              return runBookingChange(
                (cancel) => changeDepartmentStatus(departmentId, isActive, cancel),
                'Department status updated',
              )
            }}
            onChangeDoctorStatus={async (doctor, isActive) => {
              if (!confirmAction(`${isActive ? 'Activate' : 'Deactivate'} ${doctor.name}?`)) return { ok: false }
              return runBookingChange((cancel) => changeDoctorStatus(doctor, isActive, cancel), 'Doctor status updated')
            }}
            onChangeSchedule={(input) => runBookingChange((cancel) => changeSchedule(input, cancel), 'Schedule updated')}
            onChangeUserRole={async (userId, role) => {
              if (!confirmAction(`Change this user role to ${role}?`)) return { ok: false }
              return runBookingChange((cancel) => changeUserRole(userId, role, cancel), 'User role updated')
            }}
            onCreateDepartment={(name) => runAction(() => createDepartment(name), 'Department created')}
            onCreateSchedule={(input) => runAction(() => createSchedule(input), 'Schedule created')}
            onCreateUser={(name, password) => runAction(() => createUser(name, password), 'User created')}
            onResetPassword={async (userId, password) => {
              if (!confirmAction('Reset password for this user?')) return { ok: false }
              return runAction(() => resetPassword(userId, password), 'Password reset')
            }}
          />
        )}
      </main>

      {pendingChange && (
        <AffectedBookingsDialog
          affected={pendingChange.affected}
          loading={loading}
          onCancelBookings={pendingChange.confirm}
          onClose={pendingChange.dismiss}
        />
      )}

      {changingPassword && (
        <ChangePasswordDialog
          loading={loading}
          onChangePassword={async (currentPassword, newPassword) => {
            const outcome = await runAction(() => changeOwnPassword(currentPassword, newPassword), 'Password changed')
            if (outcome.ok) setSession(getStoredSession())
            return outcome
          }}
          onClose={() => setChangingPassword(false)}
        />
      )}
    </div>
  )
}

export default App
