import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AffectedBookingsError,
  canListUsers,
  cancelAppointment,
  changeAppointmentStatus,
  changeOwnPassword,
  clearSession,
  createAppointment,
  getStoredSession,
  isDemoRole,
  loadHospitalData,
  moveAppointment,
  PossiblePatientMatchError,
  renewSessionIfDue,
  sessionExpiredEvent,
  updatePatient,
} from './api'
import type { AppointmentDto, CancelAffected, CreateAppointmentInput, DoctorDto, UpdatePatientInput } from './api'
import './App.css'
import { AffectedBookingsDialog } from './components/AffectedBookingsDialog'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useAdminActions } from './hooks/useAdminActions'
import { useDialogs } from './hooks/useDialogs'
import { useHash } from './hooks/useHash'
import { useUsersPage } from './hooks/useUsersPage'
import { useWeekAppointments } from './hooks/useWeekAppointments'
import { WorkspaceContext } from './hooks/useWorkspace'
import type { Workspace } from './hooks/useWorkspace'
import { adminTitle, formatLongDate, formatTime } from './lib/format'
import { newId } from './lib/id'
import { canUseAdmin, canUseDoctor, canUseReception, hashFor, screenFor, usesHospitalData } from './lib/routes'
import { defaultDoctor } from './lib/schedule'
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
  const [hash, navigate] = useHash()
  const screen: Screen = session ? screenFor(session.role, hash) : 'reception'
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
  const { dialog, confirm, chooseDepartment, dismiss: dismissDialog } = useDialogs()
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

  // The address names no screen this user can see: show the one they get
  // instead, without adding a step to the browser history.
  useEffect(() => {
    if (session && hash !== hashFor(screen)) navigate(hashFor(screen), true)
  }, [session, hash, screen, navigate])

  // A newer refresh replaces an older one still on its way, so a slow
  // answer can never overwrite a fresher one.
  const refreshRequest = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    if (!session || !usesHospitalData(session.role)) return

    refreshRequest.current?.abort()
    const request = new AbortController()
    refreshRequest.current = request

    return loadHospitalData(request.signal)
      .then((nextData) => {
        if (request.signal.aborted) return
        setData(nextData)
        setSelectedDoctorId((current) => current ?? defaultDoctor(nextData.doctors, nextData.schedules)?.doctorId ?? null)
        setSelectedDepartmentId((current) => current ?? nextData.departments[0]?.id ?? null)
      })
      .catch((refreshError) => {
        if (request.signal.aborted) return
        setError(refreshError instanceof Error ? refreshError.message : 'Failed to load backend data')
      })
      .finally(() => {
        if (refreshRequest.current === request) setLoading(false)
      })
  }, [session])

  // Everything on screen: the shared lists, plus the visible week or users page.
  const reloadAll = useCallback(async () => {
    if (!session || !usesHospitalData(session.role)) return

    setLoading(true)
    setError(null)
    await Promise.all([refresh(), reloadAppointments(), reloadUsers()])
  }, [session, refresh, reloadAppointments, reloadUsers])

  const actionInFlight = useRef<symbol | null>(null)
  const pendingChangeCancel = useRef<(() => void) | null>(null)
  const sessionEpoch = useRef(0)

  // Kept between renders while the session and reloadAll are, so the screens'
  // callbacks built on it keep theirs too. A renewed token or a password
  // change keeps the session's id, so its actions carry on.
  const runAction = useCallback(async (
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<ActionOutcome> => {
    if (!session || getStoredSession()?.id !== session.id) return { ok: false }
    if (isDemoRole(session?.role)) {
      const message = 'Not allowed to do that. Demo accounts are read-only.'
      setError(message)
      setNotice(null)
      return { ok: false, error: message }
    }

    if (actionInFlight.current) return { ok: false }
    const request = Symbol()
    const epoch = sessionEpoch.current
    actionInFlight.current = request
    const isCurrent = () =>
      actionInFlight.current === request && sessionEpoch.current === epoch && getStoredSession()?.id === session.id

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (!isCurrent()) return { ok: false }
      await reloadAll()
      if (!isCurrent()) return { ok: false }
      setNotice(successMessage)
      setActivity((current) => [{ id: newId(), message: successMessage, at: new Date().toISOString() }, ...current].slice(0, 8))
      return { ok: true }
    } catch (actionError) {
      if (!isCurrent()) return { ok: false }
      const message = actionError instanceof Error ? actionError.message : 'Operation failed'
      // These open a dialog of their own instead.
      if (!(actionError instanceof PossiblePatientMatchError || actionError instanceof AffectedBookingsError)) {
        setError(message)
      }
      return { ok: false, error: message, cause: actionError }
    } finally {
      if (actionInFlight.current === request) {
        actionInFlight.current = null
        if (getStoredSession()?.id === session.id) setLoading(false)
      }
    }
  }, [session, reloadAll])

  // A change that can strand future bookings. When the API refuses it, the
  // admin sees the bookings and decides; the outcome is that decision's.
  const runBookingChange = useCallback(async (
    change: (cancel?: CancelAffected) => Promise<unknown>,
    successMessage: string,
  ): Promise<ActionOutcome> => {
    const epoch = sessionEpoch.current
    const outcome = await runAction(() => change(), successMessage)
    if (outcome.ok || !(outcome.cause instanceof AffectedBookingsError)) return outcome
    if (!session || sessionEpoch.current !== epoch || getStoredSession()?.id !== session.id) return { ok: false }

    const affected = outcome.cause
    return new Promise<ActionOutcome>((resolve) => {
      let settled = false
      const finish = (result: ActionOutcome) => {
        if (settled) return
        settled = true
        if (pendingChangeCancel.current === dismiss) {
          pendingChangeCancel.current = null
          setPendingChange(null)
        }
        resolve(result)
      }
      const dismiss = () => finish({ ok: false })
      pendingChangeCancel.current?.()
      pendingChangeCancel.current = dismiss
      setPendingChange({
        affected,
        confirm: async (reason) => {
          const retried = await runAction(
            () => change({ cancelAffectedAppointments: true, cancellationReason: reason }),
            successMessage,
          )
          if (retried.ok) finish(retried)
          else if (!settled && retried.cause instanceof AffectedBookingsError) {
            // More bookings were made meanwhile; show the new list.
            const latest = retried.cause
            setPendingChange((current) => current && { ...current, affected: latest })
          }
          return retried
        },
        dismiss,
      })
    })
  }, [runAction, session])

  const adminActions = useAdminActions(data.departments, runAction, runBookingChange, { confirm, chooseDepartment })
  const markAppointment = useCallback(
    (appointmentId: number, status: 'Completed' | 'NoShow') =>
      runAction(
        () => changeAppointmentStatus(appointmentId, status),
        status === 'Completed' ? 'Appointment marked completed' : 'Appointment marked no-show',
      ),
    [runAction],
  )
  const bookAppointment = useCallback(
    (input: CreateAppointmentInput) => runAction(() => createAppointment(input), 'Appointment booked'),
    [runAction],
  )
  const cancelBooking = useCallback(
    (appointmentId: number, reason: string) =>
      runAction(() => cancelAppointment(appointmentId, reason), 'Appointment cancelled'),
    [runAction],
  )
  const savePatient = useCallback(
    (patientId: number, input: UpdatePatientInput) =>
      runAction(() => updatePatient(patientId, input), 'Patient details saved'),
    [runAction],
  )
  // The desk picks the new slot on the grid, then confirms here.
  const moveBooking = useCallback(
    async (appointment: AppointmentDto, appointmentTime: Date, doctor: DoctorDto): Promise<ActionOutcome> => {
      const otherDoctor = doctor.doctorId !== appointment.doctorId
      const confirmed = await confirm({
        title: 'Move appointment',
        message: `Move ${appointment.patientName}'s appointment to ${formatLongDate(appointmentTime)} at ${formatTime(appointmentTime)}${otherDoctor ? ` with ${doctor.name}` : ''}?`,
        confirmLabel: 'Move appointment',
      })
      if (!confirmed) return { ok: false }
      return runAction(
        () => moveAppointment(appointment.appointmentId, appointmentTime, otherDoctor ? doctor.doctorId : undefined),
        'Appointment moved',
      )
    },
    [confirm, runAction],
  )

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

  const resetSessionState = useCallback(() => {
    sessionEpoch.current++
    refreshRequest.current?.abort()
    actionInFlight.current = null
    pendingChangeCancel.current?.()
    setSession(null)
    setLoading(false)
    setError(null)
    setNotice(null)
    setActivity([])
    setData(emptyData)
    setSelectedDoctorId(null)
    setWeekOffset(0)
    setSelectedDepartmentId(null)
    setSearchQuery('')
    setPendingChange(null)
    setChangingPassword(false)
    dismissDialog()
  }, [dismissDialog])

  useEffect(() => {
    window.addEventListener(sessionExpiredEvent, resetSessionState)
    return () => window.removeEventListener(sessionExpiredEvent, resetSessionState)
  }, [resetSessionState])

  // Someone at the computer keeps the session going, even on a screen that
  // sends no requests; renewSessionIfDue does nothing until it is due.
  useEffect(() => {
    if (!session) return
    const renew = () => void renewSessionIfDue()
    const events = ['pointerdown', 'keydown'] as const
    for (const event of events) window.addEventListener(event, renew, { passive: true })
    return () => {
      for (const event of events) window.removeEventListener(event, renew)
    }
  }, [session])

  const handleLogin = (nextSession: Session) => {
    sessionEpoch.current++
    setSession(nextSession)
    setLoading(usesHospitalData(nextSession.role))
    setError(null)
    setActivity([])
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

          {screen === 'reception' && (
            <ReceptionDashboard
              appointments={appointments}
              selectedDoctor={selectedDoctor}
              selectedDoctorId={selectedDoctorId}
              weekOffset={weekOffset}
              onSelectDoctor={setSelectedDoctorId}
              onWeekOffsetChange={setWeekOffset}
              onCancelAppointment={cancelBooking}
              onChangeAppointmentStatus={markAppointment}
              onCreateAppointment={bookAppointment}
              onMoveAppointment={moveBooking}
            />
          )}

          {screen === 'patients' && <PatientsScreen onUpdatePatient={savePatient} />}

          {screen === 'doctor' && <DoctorDashboard onChangeAppointmentStatus={markAppointment} />}

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
