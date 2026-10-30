import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { canListUsers, changeOwnPassword, clearSession, isDemoRole, sessionExpiredEvent } from './api'
import './App.css'
import { AffectedBookingsDialog } from './components/AffectedBookingsDialog'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { SkeletonRows } from './components/ui'
import { useActionRunner } from './hooks/useActionRunner'
import { useActivity } from './hooks/useActivity'
import { useAdminActions } from './hooks/useAdminActions'
import { useDeskActions } from './hooks/useDeskActions'
import { useDialogs } from './hooks/useDialogs'
import { useHash } from './hooks/useHash'
import { useHospitalData } from './hooks/useHospitalData'
import { useSession } from './hooks/useSession'
import { useUsersPage } from './hooks/useUsersPage'
import { useWeekAppointments } from './hooks/useWeekAppointments'
import { WorkspaceContext } from './hooks/useWorkspace'
import type { Workspace } from './hooks/useWorkspace'
import { adminTitle } from './lib/format'
import { canUseAdmin, canUseDoctor, canUseReception, hashFor, screenFor, usesHospitalData } from './lib/routes'
import { defaultDoctor } from './lib/schedule'
import { LoginScreen } from './screens/LoginScreen'
import { NoAccessScreen } from './screens/NoAccessScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import type { HospitalData, Screen, Session } from './types'

const AdminDashboard = lazy(() => import('./screens/AdminDashboard').then((screen) => ({ default: screen.AdminDashboard })))
const DoctorDashboard = lazy(() => import('./screens/DoctorDashboard').then((screen) => ({ default: screen.DoctorDashboard })))
const PatientsScreen = lazy(() => import('./screens/PatientsScreen').then((screen) => ({ default: screen.PatientsScreen })))
const ReceptionDashboard = lazy(() =>
  import('./screens/ReceptionDashboard').then((screen) => ({ default: screen.ReceptionDashboard })),
)

function screenTitle(screen: Screen) {
  if (screen === 'reception') return 'Reception'
  if (screen === 'patients') return 'Patients'
  if (screen === 'doctor') return 'My day'
  return adminTitle(screen)
}

function App() {
  const { session, epoch, begin: beginSession, end: endSession } = useSession()
  const [hash, navigate] = useHash()
  const screen: Screen = session ? screenFor(session.role, hash) : 'reception'
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const { dialog, confirm, chooseDepartment, dismiss: dismissDialog } = useDialogs()
  const { activity, record: recordActivity, clear: clearActivity } = useActivity()

  const pickDefaults = useCallback((loaded: HospitalData) => {
    setSelectedDoctorId((current) => current ?? defaultDoctor(loaded.doctors, loaded.schedules)?.doctorId ?? null)
    setSelectedDepartmentId((current) => current ?? loaded.departments[0]?.id ?? null)
  }, [])
  const { data, loading, setLoading, refresh, clear: clearData } = useHospitalData(session, pickDefaults, setError)

  const selectedDoctor =
    data.doctors.find((doctor) => doctor.doctorId === selectedDoctorId) ??
    defaultDoctor(data.doctors, data.schedules) ??
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

  const setScreen = useCallback((next: Screen) => navigate(hashFor(next)), [navigate])

  useEffect(() => {
    if (session && hash !== hashFor(screen)) navigate(hashFor(screen), true)
  }, [session, hash, screen, navigate])

  const reloadAll = useCallback(async () => {
    if (!session || !usesHospitalData(session.role)) return

    setLoading(true)
    setError(null)
    await Promise.all([refresh(), reloadAppointments(), reloadUsers()])
  }, [session, setLoading, refresh, reloadAppointments, reloadUsers])

  const { runAction, runBookingChange, pendingChange, reset: resetActions } = useActionRunner(session, epoch, {
    reloadAll,
    setLoading,
    setError,
    setNotice,
    onSuccess: recordActivity,
  })
  const adminActions = useAdminActions(data.departments, runAction, runBookingChange, { confirm, chooseDepartment })
  const deskActions = useDeskActions(runAction, confirm)

  const isReadOnly = isDemoRole(session?.role)
  const workspace = useMemo<Workspace>(
    () => ({
      departments: data.departments,
      doctors: data.doctors,
      schedules: data.schedules,
      loading,
      isReadOnly,
      searchQuery,
      onError: setError,
    }),
    [data, loading, isReadOnly, searchQuery],
  )

  useEffect(() => {
    const handleFocus = () => {
      void reloadAll()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [reloadAll])

  const resetSessionState = useCallback(() => {
    endSession()
    clearData()
    resetActions()
    setError(null)
    setNotice(null)
    clearActivity()
    setSelectedDoctorId(null)
    setWeekOffset(0)
    setSelectedDepartmentId(null)
    setSearchQuery('')
    setChangingPassword(false)
    dismissDialog()
  }, [endSession, clearData, resetActions, clearActivity, dismissDialog])

  useEffect(() => {
    window.addEventListener(sessionExpiredEvent, resetSessionState)
    return () => window.removeEventListener(sessionExpiredEvent, resetSessionState)
  }, [resetSessionState])

  const handleLogin = (nextSession: Session) => {
    beginSession(nextSession)
    setLoading(usesHospitalData(nextSession.role))
    setError(null)
    clearActivity()
  }

  const handleLogout = () => {
    clearSession()
    resetSessionState()
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

  return (
    <WorkspaceContext value={workspace}>
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
            onSearchChange={screen === 'doctor' ? undefined : setSearchQuery}
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

          <Suspense
            fallback={
              <section className="panel" aria-busy="true">
                <SkeletonRows count={6} />
              </section>
            }
          >
            {screen === 'reception' && (
              <ReceptionDashboard
                appointments={appointments}
                selectedDoctor={selectedDoctor}
                selectedDoctorId={selectedDoctorId}
                weekOffset={weekOffset}
                onSelectDoctor={setSelectedDoctorId}
                onWeekOffsetChange={setWeekOffset}
                onCancelAppointment={deskActions.cancelAppointment}
                onChangeAppointmentStatus={deskActions.markAppointment}
                onCreateAppointment={deskActions.bookAppointment}
                onMoveAppointment={deskActions.moveAppointment}
              />
            )}

            {screen === 'patients' && <PatientsScreen onUpdatePatient={deskActions.updatePatient} />}

            {screen === 'doctor' && <DoctorDashboard onChangeAppointmentStatus={deskActions.markAppointment} />}

            {canUseAdmin(session.role) && screen !== 'reception' && screen !== 'patients' && screen !== 'doctor' && (
              <AdminDashboard
                section={screen}
                selectedDepartmentId={selectedDepartmentId}
                activity={activity}
                usersPage={usersPage}
                usersLoading={usersLoading}
                canReadAuditLog={session.role === 'Admin'}
                actions={adminActions}
                onNavigate={setScreen}
                onSelectDepartment={setSelectedDepartmentId}
                onUsersPageChange={setUsersPage}
              />
            )}
          </Suspense>
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
            onChangePassword={(currentPassword, newPassword) =>
              runAction(() => changeOwnPassword(currentPassword, newPassword), 'Password changed')
            }
            onClose={() => setChangingPassword(false)}
          />
        )}

        {dialog}
      </div>
    </WorkspaceContext>
  )
}

export default App
