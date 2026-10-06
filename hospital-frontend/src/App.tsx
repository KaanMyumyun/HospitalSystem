import { useCallback, useEffect, useRef, useState } from 'react'
import {
  canListUsers,
  cancelAppointment,
  changeDepartmentStatus,
  changeDoctorDepartment,
  changeDoctorStatus,
  changeSchedule,
  changeUserRole,
  clearSession,
  createAppointment,
  createDepartment,
  createSchedule,
  createUser,
  getStoredSession,
  loadHospitalData,
  resetPassword,
  sessionExpiredEvent,
} from './api'
import type { UserRole } from './api'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useUsersPage } from './hooks/useUsersPage'
import { useWeekAppointments } from './hooks/useWeekAppointments'
import { adminTitle, confirmAction } from './lib/format'
import { AdminDashboard } from './screens/AdminDashboard'
import { LoginScreen } from './screens/LoginScreen'
import { NoAccessScreen } from './screens/NoAccessScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
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

function App() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession())
  const [screen, setScreen] = useState<Screen>(() => {
    const stored = getStoredSession()
    return stored && canUseAdmin(stored.role) ? 'departments' : 'reception'
  })
  const [data, setData] = useState<HospitalData>(emptyData)
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [loading, setLoading] = useState(() =>
    session !== null && (canUseAdmin(session.role) || canUseReception(session.role)),
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
    if (!session || !(canUseAdmin(session.role) || canUseReception(session.role))) return

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
    if (!session || !(canUseAdmin(session.role) || canUseReception(session.role))) return

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
      setError(message)
      return { ok: false, error: message }
    } finally {
      actionInFlight.current = false
      setLoading(false)
    }
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
    }

    window.addEventListener(sessionExpiredEvent, handleSessionExpired)
    return () => window.removeEventListener(sessionExpiredEvent, handleSessionExpired)
  }, [])

  const handleLogin = (nextSession: Session) => {
    setSession(nextSession)
    setLoading(canUseAdmin(nextSession.role) || canUseReception(nextSession.role))
    setError(null)
    setActivity([])
    setScreen(canUseAdmin(nextSession.role) ? 'departments' : 'reception')
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
  }

  const pathname = window.location.pathname
  if (pathname !== '/' && pathname !== '') {
    return <NotFoundScreen />
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (!canUseAdmin(session.role) && !canUseReception(session.role)) {
    return <NoAccessScreen role={session.role} onLogout={handleLogout} />
  }

  const selectedDepartment =
    data.departments.find((department) => department.id === selectedDepartmentId) ?? data.departments[0] ?? null

  return (
    <div className="app-shell">
      <Sidebar
        canUseAdmin={canUseAdmin(session.role)}
        canUseReception={canUseReception(session.role)}
        screen={screen}
        onChange={setScreen}
      />
      <main className="workspace">
        <TopBar
          loading={loading}
          role={screen === 'reception' ? 'Reception' : adminTitle(screen)}
          userRole={session.role}
          searchQuery={searchQuery}
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

        {screen === 'reception' ? (
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
            isReadOnly={session.role.startsWith('Demo')}
            onSelectDoctor={setSelectedDoctorId}
            onWeekOffsetChange={setWeekOffset}
            onCancelAppointment={(appointmentId, reason) =>
              runAction(
                () => cancelAppointment({ AppointmentId: appointmentId, Reason: reason }),
                'Appointment cancelled',
              )
            }
            onCreateAppointment={(input) => runAction(() => createAppointment(input), 'Appointment booked')}
          />
        ) : (
          <AdminDashboard
            departments={data.departments}
            doctors={data.doctors}
            loading={loading}
            schedules={data.schedules}
            selectedDepartment={selectedDepartment}
            selectedDepartmentId={selectedDepartmentId}
            section={screen}
            searchQuery={searchQuery}
            isReadOnly={session.role.startsWith('Demo')}
            activity={activity}
            usersPage={usersPage}
            usersLoading={usersLoading}
            onNavigate={setScreen}
            onUsersPageChange={setUsersPage}
            onSelectDepartment={setSelectedDepartmentId}
            onAssignDoctor={async (doctorId, departmentId) => {
              if (!confirmAction('Assign doctor to this department?')) return { ok: false }
              return runAction(() => changeDoctorDepartment(doctorId, departmentId), 'Doctor department updated')
            }}
            onChangeDepartmentStatus={async (departmentId, isActive) => {
              if (!confirmAction(`${isActive ? 'Activate' : 'Deactivate'} this department?`)) return { ok: false }
              return runAction(() => changeDepartmentStatus(departmentId, isActive), 'Department status updated')
            }}
            onChangeDoctorStatus={async (doctor, isActive) => {
              if (!confirmAction(`${isActive ? 'Activate' : 'Deactivate'} ${doctor.name}?`)) return { ok: false }
              return runAction(() => changeDoctorStatus(doctor, isActive), 'Doctor status updated')
            }}
            onChangeSchedule={(input) => runAction(() => changeSchedule(input), 'Schedule updated')}
            onChangeUserRole={async (userId, role) => {
              if (!confirmAction(`Change this user role to ${role}?`)) return { ok: false }
              return runAction(() => changeUserRole(userId, role), 'User role updated')
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
    </div>
  )
}

export default App
