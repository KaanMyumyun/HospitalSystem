import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  X,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearSession,
  cancelAppointment,
  changeDepartmentStatus,
  changeDoctorDepartment,
  changeDoctorStatus,
  changeSchedule,
  changeUserRole,
  createAppointment,
  createDepartment,
  createSchedule,
  createUser,
  getStoredSession,
  loadHospitalData,
  login,
  resetPassword,
  type AppointmentDto,
  type ChangeScheduleInput,
  type CreateAppointmentInput,
  type CreateScheduleInput,
  type DepartmentDto,
  type DoctorDto,
  type ScheduleDto,
  type UserDto,
  type UserRole,
} from './api'
import './App.css'

type AdminSection = 'departments' | 'doctors' | 'schedules' | 'users'
type Screen = 'reception' | AdminSection
type SlotStatus = 'available' | 'booked' | 'cancelled' | 'past' | 'empty'
type Session = { token: string; role: UserRole }
type HospitalData = {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  users: UserDto[]
  schedules: ScheduleDto[]
  appointments: AppointmentDto[]
}
type ActivityEntry = {
  id: string
  message: string
  at: string
}
type Slot = {
  day: Date
  time: string
  status: SlotStatus
  appointment?: AppointmentDto
}

const emptyData: HospitalData = {
  departments: [],
  doctors: [],
  users: [],
  schedules: [],
  appointments: [],
}
const activityStorageKey = 'hospital-ui-v2-activity'

function App() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession())
  const [screen, setScreen] = useState<Screen>(() => {
    const stored = getStoredSession()
    return stored?.role === 'Admin' || stored?.role === 'DemoAdmin' ? 'departments' : 'reception'
  })
  const [data, setData] = useState<HospitalData>(emptyData)
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
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

  const refresh = useCallback(async () => {
    if (!session) return

    setLoading(true)
    setError(null)
    try {
      const nextData = await loadHospitalData(session.role)
      setData(nextData)
      setSelectedDoctorId((current) => current ?? nextData.doctors.find((doctor) => doctor.isActive)?.doctorId ?? null)
      setSelectedDepartmentId((current) => current ?? nextData.departments[0]?.id ?? null)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load backend data')
    } finally {
      setLoading(false)
    }
  }, [session])

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    if (session?.role.startsWith('Demo')) {
      setError('Not allowed to do that. Demo accounts are read-only.')
      setNotice(null)
      return
    }

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      await refresh()
      setNotice(successMessage)
      setActivity((current) => {
        const next = [{ id: crypto.randomUUID(), message: successMessage, at: new Date().toISOString() }, ...current].slice(0, 8)
        localStorage.setItem(activityStorageKey, JSON.stringify(next))
        return next
      })
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleFocus = () => {
      void refresh()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refresh])

  const handleLogin = (nextSession: Session) => {
    setSession(nextSession)
    setScreen(nextSession.role === 'Admin' || nextSession.role === 'DemoAdmin' ? 'departments' : 'reception')
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setData(emptyData)
    setSelectedDoctorId(null)
    setSelectedDepartmentId(null)
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const selectedDoctor =
    data.doctors.find((doctor) => doctor.doctorId === selectedDoctorId) ??
    data.doctors.find((doctor) => doctor.isActive) ??
    null
  const selectedDepartment =
    data.departments.find((department) => department.id === selectedDepartmentId) ?? data.departments[0] ?? null
  const canUseAdmin = session.role === 'Admin' || session.role === 'DemoAdmin'
  const canUseReception = session.role === 'FrontDesk' || session.role === 'DemoFrontDesk'

  return (
    <div className="app-shell">
      <Sidebar
        canUseAdmin={canUseAdmin}
        canUseReception={canUseReception}
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
          onRefresh={refresh}
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
            appointments={data.appointments}
            departments={data.departments}
            doctors={data.doctors}
            loading={loading}
            schedules={data.schedules}
            selectedDoctor={selectedDoctor}
            selectedDoctorId={selectedDoctorId}
            searchQuery={searchQuery}
            isReadOnly={session.role.startsWith('Demo')}
            onSelectDoctor={setSelectedDoctorId}
            onCancelAppointment={(appointmentId, reason) =>
              runAction(
                () => cancelAppointment({ AppointmentId: appointmentId, Status: 'Cancelled', Reason: reason }),
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
            users={data.users}
            onNavigate={setScreen}
            onSelectDepartment={setSelectedDepartmentId}
            onAssignDoctor={async (doctorId, departmentId) => {
              if (confirmAction('Assign doctor to this department?')) {
                await runAction(() => changeDoctorDepartment(doctorId, departmentId), 'Doctor department updated')
              }
            }}
            onChangeDepartmentStatus={async (departmentId, isActive) => {
              if (confirmAction(`${isActive ? 'Activate' : 'Deactivate'} this department?`)) {
                await runAction(() => changeDepartmentStatus(departmentId, isActive), 'Department status updated')
              }
            }}
            onChangeDoctorStatus={async (doctor, isActive) => {
              if (confirmAction(`${isActive ? 'Activate' : 'Deactivate'} ${doctor.name}?`)) {
                await runAction(() => changeDoctorStatus(doctor, isActive), 'Doctor status updated')
              }
            }}
            onChangeSchedule={(input) => runAction(() => changeSchedule(input), 'Schedule updated')}
            onChangeUserRole={async (userId, role) => {
              if (confirmAction(`Change this user role to ${role}?`)) {
                await runAction(() => changeUserRole(userId, role), 'User role updated')
              }
            }}
            onCreateDepartment={(name) => runAction(() => createDepartment(name), 'Department created')}
            onCreateSchedule={(input) => runAction(() => createSchedule(input), 'Schedule created')}
            onCreateUser={(name, password) => runAction(() => createUser(name, password), 'User created')}
            onResetPassword={async (userId, password) => {
              if (confirmAction('Reset password for this user?')) {
                await runAction(() => resetPassword(userId, password), 'Password reset')
              }
            }}
          />
        )}
      </main>
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (loginName = name, loginPassword = password) => {
    setSubmitting(true)
    setError(null)
    const result = await login(loginName, loginPassword)
    setSubmitting(false)

    if (!result.isSuccess || !result.token || !result.role) {
      setError(result.error ?? 'Invalid credentials')
      return
    }

    onLogin({ token: result.token, role: result.role })
  }

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
          <p className="eyebrow">Secure access</p>
          <h1>Staff sign in</h1>
          <p>Use your hospital account to continue.</p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label>
            Username
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-row">
          <button className="secondary-button" type="button" onClick={() => void submit('DemoAdmin', '12345678')}>
            Demo Admin
          </button>
          <button className="secondary-button" type="button" onClick={() => void submit('DemoReception', '12345678')}>
            Demo Reception
          </button>
        </div>
      </section>

      <section className="login-preview" aria-hidden="true">
        <div className="preview-shell">
          <div className="preview-main">
            <div className="preview-top">
              <div>
                <p className="eyebrow">Today</p>
                <strong>Clinic flow</strong>
              </div>
              <StatusBadge tone="success">Live</StatusBadge>
            </div>
            <div className="preview-board">
              <div className="preview-card">
                <span className="doctor-avatar">C</span>
                <div>
                  <strong>Chen</strong>
                  <small>Next slot 09:40</small>
                </div>
              </div>
              <div className="preview-card">
                <span className="doctor-avatar">S</span>
                <div>
                  <strong>Sarah</strong>
                  <small>Orthopedics</small>
                </div>
              </div>
            </div>
            <div className="preview-grid">
              {Array.from({ length: 12 }, (_, index) => (
                <span className={index % 5 === 0 ? 'booked' : index % 7 === 0 ? 'cancelled' : ''} key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Sidebar({
  canUseAdmin,
  canUseReception,
  screen,
  onChange,
}: {
  canUseAdmin: boolean
  canUseReception: boolean
  screen: Screen
  onChange: (screen: Screen) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Activity size={20} />
        </div>
        <div>
          <strong>Hospital System</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {canUseReception && (
          <button
            className={`nav-item ${screen === 'reception' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('reception')}
          >
            <CalendarDays size={18} />
            Reception
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'departments' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('departments')}
          >
            <ShieldCheck size={18} />
            Departments
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'doctors' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('doctors')}
          >
            <Stethoscope size={18} />
            Doctors
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'schedules' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('schedules')}
          >
            <Clock3 size={18} />
            Schedules
          </button>
        )}
        {canUseAdmin && (
          <button
            className={`nav-item ${screen === 'users' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('users')}
          >
            <UsersRound size={18} />
            Users
          </button>
        )}
      </nav>
    </aside>
  )
}

function TopBar({
  loading,
  role,
  searchQuery,
  userRole,
  onLogout,
  onRefresh,
  onSearchChange,
}: {
  loading: boolean
  role: string
  searchQuery: string
  userRole: UserRole
  onLogout: () => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Live backend</p>
        <h1>{role === 'Reception' ? 'Reception Dashboard' : role}</h1>
      </div>
      <div className="topbar-actions">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search"
            placeholder="Search this page..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <button className="icon-text-button" disabled={loading} type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="user-menu" type="button" onClick={onLogout}>
          <span className="avatar">{userRole.slice(0, 2).toUpperCase()}</span>
          <span>{userRole}</span>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  )
}

function ReceptionDashboard({
  appointments,
  departments,
  doctors,
  loading,
  schedules,
  selectedDoctor,
  selectedDoctorId,
  searchQuery,
  isReadOnly,
  onCancelAppointment,
  onCreateAppointment,
  onSelectDoctor,
}: {
  appointments: AppointmentDto[]
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  loading: boolean
  schedules: ScheduleDto[]
  selectedDoctor: DoctorDto | null
  selectedDoctorId: number | null
  searchQuery: string
  isReadOnly: boolean
  onCancelAppointment: (appointmentId: number, reason: string) => Promise<void>
  onCreateAppointment: (input: CreateAppointmentInput) => Promise<void>
  onSelectDoctor: (doctorId: number) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null)
  const [patientName, setPatientName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all')
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive), [departments])
  const activeDepartmentIds = useMemo(
    () => new Set(activeDepartments.map((department) => department.id)),
    [activeDepartments],
  )
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const activeDoctors = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          doctor.isActive &&
          activeDepartmentIds.has(doctor.departmentId) &&
          (departmentFilter === 'all' || doctor.departmentId === departmentFilter) &&
          (!normalizedSearch ||
            doctor.name.toLowerCase().includes(normalizedSearch) ||
            departmentName(departments, doctor.departmentId).toLowerCase().includes(normalizedSearch)),
      ),
    [activeDepartmentIds, departmentFilter, departments, doctors, normalizedSearch],
  )
  useEffect(() => {
    if (activeDoctors.length > 0 && !activeDoctors.some((doctor) => doctor.doctorId === selectedDoctorId)) {
      onSelectDoctor(activeDoctors[0].doctorId)
    }
  }, [activeDoctors, onSelectDoctor, selectedDoctorId])
  const selectedSchedule = schedules.find((schedule) => schedule.doctorId === selectedDoctor?.doctorId)
  const slots = useMemo(
    () => buildWeekSlots(selectedSchedule, selectedDoctor?.doctorId, appointments, weekOffset),
    [appointments, selectedDoctor?.doctorId, selectedSchedule, weekOffset],
  )
  const nextAvailableSlot = useMemo(() => getNextAvailableSlot(slots), [slots])
  const visibleAppointment = selectedAppointment ?? slots.flat().find((slot) => slot.appointment)?.appointment ?? null
  const counts = {
    booked: slots.flat().filter((slot) => slot.status === 'booked').length,
    available: slots.flat().filter((slot) => slot.status === 'available').length,
    cancelled: appointments.filter((appointment) => appointment.status === 'Cancelled').length,
  }
  const closeBooking = () => {
    setSelectedSlot(null)
    setPatientName('')
    setPhoneNumber('')
    setDateOfBirth('')
    setBookingError(null)
  }
  const closeCancellation = () => {
    setSelectedAppointment(null)
    setCancelReason('')
  }
  const submitBooking = async () => {
    if (!selectedSlot || !selectedDoctor) return
    const appointmentTime = dateAtTime(selectedSlot.day, selectedSlot.time)
    const validationError = validateAppointmentInput(patientName, phoneNumber, dateOfBirth, appointmentTime)
    if (validationError) {
      setBookingError(validationError)
      return
    }

    await onCreateAppointment({
      DoctorId: selectedDoctor.doctorId,
      PatientName: patientName.trim(),
      PhoneNumber: phoneNumber.trim(),
      DateOfBirth: parseDateInput(dateOfBirth).toISOString(),
      AppointmentTime: appointmentTime.toISOString(),
    })
    closeBooking()
  }
  const submitCancellation = async () => {
    if (!selectedAppointment) return
    await onCancelAppointment(selectedAppointment.appointmentId, cancelReason)
    closeCancellation()
  }

  return (
    <section className="screen-grid reception-grid">
      <aside className="panel doctor-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Doctors</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Doctor filter">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="section-label">Departments</div>
        <div className="department-picker">
          <button
            className={`department-pill ${departmentFilter === 'all' ? 'active' : ''}`}
            type="button"
            onClick={() => setDepartmentFilter('all')}
          >
            <strong>All</strong>
            <span>{doctors.filter((doctor) => doctor.isActive && activeDepartmentIds.has(doctor.departmentId)).length} doctors</span>
          </button>
          {activeDepartments.map((department) => {
            const count = doctors.filter((doctor) => doctor.isActive && doctor.departmentId === department.id).length
            return (
              <button
                className={`department-pill ${departmentFilter === department.id ? 'active' : ''}`}
                type="button"
                key={department.id}
                onClick={() => setDepartmentFilter(department.id)}
              >
                <strong>{department.name}</strong>
                <span>{count} doctors</span>
              </button>
            )
          })}
        </div>

        <div className="doctor-list">
          {activeDoctors.map((doctor) => (
            <button
              className={`doctor-card ${doctor.doctorId === selectedDoctorId ? 'selected' : ''}`}
              type="button"
              key={doctor.doctorId}
              onClick={() => onSelectDoctor(doctor.doctorId)}
            >
              <span className="doctor-avatar">{initials(doctor.name)}</span>
              <span>
                <strong>{doctor.name}</strong>
                <small>{departmentName(departments, doctor.departmentId)}</small>
              </span>
              <StatusBadge tone="success">Active</StatusBadge>
            </button>
          ))}
          {!loading && activeDoctors.length === 0 && <EmptyState text="No active doctors returned by the API." />}
        </div>
      </aside>

      <section className="panel schedule-panel">
        <div className="panel-heading schedule-title-row">
          <div>
            <p className="eyebrow">Weekly calendar</p>
            <h2>{selectedDoctor?.name ?? 'Select a doctor'}</h2>
            <p className="subtle">
              {selectedSchedule
                ? `${departmentName(departments, selectedDoctor?.departmentId)} · ${selectedSchedule.slotDurationMin} min slots · ${formatHourRange(selectedSchedule)}`
                : 'No schedule returned for this doctor'}
            </p>
          </div>
          <div className="metric-row">
            <Metric label="Booked" value={counts.booked} tone="blue" />
            <Metric label="Open" value={counts.available} tone="green" />
            <Metric label="Cancelled" value={counts.cancelled} tone="red" />
          </div>
        </div>

        <div className="toolbar calendar-toolbar">
          <button className="secondary-button" type="button" onClick={() => setWeekOffset((value) => value - 1)}>
            Previous Week
          </button>
          <button className="secondary-button" type="button" onClick={() => setWeekOffset(0)}>
            Current Week
          </button>
          <button className="secondary-button" type="button" onClick={() => setWeekOffset((value) => value + 1)}>
            Next Week
          </button>
        </div>

        <div className="schedule-scroll">
          <div className="schedule-grid" role="grid" aria-label="Weekly appointment schedule">
            <div className="grid-corner">Time</div>
            {weekDays(weekOffset).map((day) => (
              <div className={`day-cell ${isSameDay(day, new Date()) ? 'today' : ''}`} key={day.toISOString()}>
                {formatDay(day)}
                {isSameDay(day, new Date()) ? <small>Today</small> : null}
              </div>
            ))}
            {slots.map((row, rowIndex) =>
              [
                <div className="time-cell" key={`time-${rowIndex}`}>
                  {row.find((slot) => slot.time)?.time ?? ''}
                </div>,
                ...row.map((slot) => (
                  <button
                    className={`slot-cell ${slot.status}`}
                    disabled={slot.status === 'empty' || slot.status === 'past'}
                    onClick={() => {
                      if (slot.appointment) {
                        setSelectedAppointment(slot.appointment)
                        return
                      }
                      if (slot.status === 'available') setSelectedSlot(slot)
                    }}
                    type="button"
                    key={`${slot.day.toISOString()}-${slot.time}`}
                  >
                    <span>{slot.time}</span>
                    <small>
                      {slot.appointment
                        ? `${slot.appointment.patientName}${slot.appointment.patientPhoneNumber ? ` · ${slot.appointment.patientPhoneNumber}` : ''}`
                        : slotLabel(slot.status)}
                    </small>
                  </button>
                )),
              ],
            )}
          </div>
        </div>
      </section>

      <aside className="panel details-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Selected</p>
            <h2>Appointment</h2>
          </div>
          <StatusBadge tone={visibleAppointment ? 'blue' : 'muted'}>
            {visibleAppointment?.status ?? 'None'}
          </StatusBadge>
        </div>

        {visibleAppointment ? (
          <>
            <div className="patient-card">
              <span className="patient-avatar">{initials(visibleAppointment.patientName)}</span>
              <div>
                <strong>{visibleAppointment.patientName}</strong>
                <small>Patient ID {visibleAppointment.patientId}</small>
              </div>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Doctor</dt>
                <dd>{selectedDoctor?.name ?? visibleAppointment.doctorName}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatLongDate(new Date(visibleAppointment.appointmentTime))}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(new Date(visibleAppointment.appointmentTime))}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{visibleAppointment.status}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{visibleAppointment.patientPhoneNumber || 'Not provided'}</dd>
              </div>
            </dl>
          </>
        ) : (
          <EmptyState text="Choose a booked slot to view appointment details." />
        )}

        <div className="stack">
          <button
            className="primary-button"
            disabled={!nextAvailableSlot || isReadOnly}
            title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
            type="button"
            onClick={() => setSelectedSlot(nextAvailableSlot)}
          >
            Book Next Available
          </button>
          <button
            className="secondary-button danger"
            disabled={!visibleAppointment || visibleAppointment.status === 'Cancelled' || isReadOnly}
            title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
            type="button"
            onClick={() => {
              if (visibleAppointment) setSelectedAppointment(visibleAppointment)
            }}
          >
            Cancel Appointment
          </button>
        </div>
      </aside>

      {selectedSlot && selectedDoctor && (
        <Modal title="Book appointment" onClose={closeBooking}>
          <div className="summary-box">
            <strong>{selectedDoctor.name}</strong>
            <span>
              {formatLongDate(selectedSlot.day)} at {selectedSlot.time}
            </span>
          </div>
          <div className="form-grid">
            <label>
              Patient Name
              <input
                maxLength={80}
                value={patientName}
                onChange={(event) => {
                  setBookingError(null)
                  setPatientName(event.target.value)
                }}
              />
            </label>
            <label>
              Phone Number
              <input
                inputMode="tel"
                maxLength={24}
                pattern="^\+?[0-9\s().-]+$"
                value={phoneNumber}
                onChange={(event) => {
                  setBookingError(null)
                  setPhoneNumber(event.target.value.replace(/[^\d\s()+.-]/g, ''))
                }}
              />
            </label>
            <label>
              Date of Birth
              <input
                max={toDateInputValue(selectedSlot.day)}
                type="date"
                value={dateOfBirth}
                onChange={(event) => {
                  setBookingError(null)
                  setDateOfBirth(event.target.value)
                }}
              />
            </label>
          </div>
          {bookingError && <div className="form-error">{bookingError}</div>}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={closeBooking}>
              Close
            </button>
            <button
              className="primary-button"
              disabled={!patientName || !phoneNumber || !dateOfBirth || isReadOnly}
              title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
              type="button"
              onClick={() => void submitBooking()}
            >
              Confirm Booking
            </button>
          </div>
        </Modal>
      )}

      {selectedAppointment && (
        <Modal title="Cancel appointment" tone="danger" onClose={closeCancellation}>
          <div className="summary-box danger">
            <strong>{selectedAppointment.patientName}</strong>
            <span>{formatLongDate(new Date(selectedAppointment.appointmentTime))}</span>
          </div>
          <div className="form-grid">
            <label>
              Cancellation Reason
              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={closeCancellation}>
              Keep Appointment
            </button>
            <button
              className="secondary-button danger"
              disabled={!cancelReason.trim() || isReadOnly}
              title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
              type="button"
              onClick={() => void submitCancellation()}
            >
              Confirm Cancellation
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function AdminDashboard({
  departments,
  doctors,
  loading,
  schedules,
  selectedDepartment,
  selectedDepartmentId,
  section,
  searchQuery,
  isReadOnly,
  activity,
  users,
  onAssignDoctor,
  onChangeDepartmentStatus,
  onChangeDoctorStatus,
  onChangeSchedule,
  onChangeUserRole,
  onCreateDepartment,
  onCreateSchedule,
  onCreateUser,
  onNavigate,
  onResetPassword,
  onSelectDepartment,
}: {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  loading: boolean
  schedules: ScheduleDto[]
  selectedDepartment: DepartmentDto | null
  selectedDepartmentId: number | null
  section: AdminSection
  searchQuery: string
  isReadOnly: boolean
  activity: ActivityEntry[]
  users: UserDto[]
  onAssignDoctor: (doctorId: number, departmentId: number) => Promise<void>
  onChangeDepartmentStatus: (departmentId: number, isActive: boolean) => Promise<void>
  onChangeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<void>
  onChangeSchedule: (input: ChangeScheduleInput) => Promise<void>
  onChangeUserRole: (userId: number, role: UserRole) => Promise<void>
  onCreateDepartment: (name: string) => Promise<void>
  onCreateSchedule: (input: CreateScheduleInput) => Promise<void>
  onCreateUser: (name: string, password: string) => Promise<void>
  onNavigate: (screen: Screen) => void
  onResetPassword: (userId: number, password: string) => Promise<void>
  onSelectDepartment: (departmentId: number) => void
}) {
  const tab = section
  const [departmentNameInput, setDepartmentNameInput] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  const [scheduleDoctorId, setScheduleDoctorId] = useState<number | ''>('')
  const [scheduleStartHour, setScheduleStartHour] = useState('8')
  const [scheduleEndHour, setScheduleEndHour] = useState('16')
  const [scheduleSlotDuration, setScheduleSlotDuration] = useState('15')
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editStartHour, setEditStartHour] = useState('')
  const [editEndHour, setEditEndHour] = useState('')
  const [editSlotDuration, setEditSlotDuration] = useState('')
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDepartments = departments.filter((department) =>
    !normalizedSearch || department.name.toLowerCase().includes(normalizedSearch),
  )
  const visibleDoctors = doctors.filter((doctor) =>
    !normalizedSearch ||
    doctor.name.toLowerCase().includes(normalizedSearch) ||
    departmentName(departments, doctor.departmentId).toLowerCase().includes(normalizedSearch),
  )
  const visibleSchedules = schedules.filter((schedule) => {
    const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
    return !normalizedSearch || (doctor?.name ?? '').toLowerCase().includes(normalizedSearch)
  })
  const visibleUsers = users.filter((user) =>
    !normalizedSearch ||
    user.userName.toLowerCase().includes(normalizedSearch) ||
    user.role.toLowerCase().includes(normalizedSearch),
  )
  const selectedDoctors = selectedDepartment
    ? doctors.filter((doctor) => doctor.departmentId === selectedDepartment.id)
    : []
  const scheduleInput = (): CreateScheduleInput => ({
    DoctorId: Number(scheduleDoctorId),
    StartHour: Number(scheduleStartHour),
    EndHour: Number(scheduleEndHour),
    SlotDurationMin: Number(scheduleSlotDuration),
  })
  const startScheduleEdit = (schedule: ScheduleDto) => {
    setEditingScheduleId(schedule.scheduleId)
    setEditStartHour(String(new Date(schedule.startTime).getUTCHours()))
    setEditEndHour(String(new Date(schedule.endTime).getUTCHours()))
    setEditSlotDuration(String(schedule.slotDurationMin))
  }

  return (
    <section className="screen-grid admin-grid">
      <section className="panel table-panel">
        <div className="panel-heading page-heading">
          <div>
            <p className="eyebrow">Management</p>
            <h2>{adminTitle(section)}</h2>
          </div>
          <PageHint section={section} />
        </div>

        {tab === 'departments' && (
          <>
            <div className="toolbar">
              <div className="search-field compact">
                <Search size={16} />
                <input aria-label="Search departments" placeholder="Search departments" />
              </div>
              <div className="inline-form">
                <input
                  placeholder="New department"
                  value={departmentNameInput}
                  onChange={(event) => setDepartmentNameInput(event.target.value)}
                />
                <button
                  className="secondary-button"
                  disabled={!departmentNameInput.trim() || isReadOnly}
                  title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                  type="button"
                  onClick={() => {
                    void onCreateDepartment(departmentNameInput)
                    setDepartmentNameInput('')
                  }}
                >
                  Add Department
                </button>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Doctors</th>
                  <th>Coverage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDepartments.map((department) => {
                  const departmentDoctors = doctors.filter((doctor) => doctor.departmentId === department.id)
                  return (
                    <tr
                      className={department.id === selectedDepartmentId ? 'selected-row' : ''}
                      key={department.id}
                      onClick={() => onSelectDepartment(department.id)}
                    >
                      <td>
                        <strong>{department.name}</strong>
                      </td>
                      <td>
                        <StatusBadge tone={department.isActive ? 'success' : 'muted'}>
                          {department.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td>{departmentDoctors.length}</td>
                      <td>{coverageForDepartment(schedules, departmentDoctors)}</td>
                      <td>
                        <button
                          className="secondary-button compact-action"
                          disabled={isReadOnly}
                          title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onChangeDepartmentStatus(department.id, !department.isActive)
                          }}
                        >
                          {department.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loading && <SkeletonRows count={5} />}
            {!loading && visibleDepartments.length === 0 && <EmptyState text="No departments found." />}
          </>
        )}

        {tab === 'doctors' && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDoctors.map((doctor) => (
                  <tr key={doctor.doctorId}>
                    <td><strong>{doctor.name}</strong></td>
                    <td><StatusBadge tone={doctor.isActive ? 'success' : 'muted'}>{doctor.isActive ? 'Active' : 'Inactive'}</StatusBadge></td>
                    <td>
                      <select
                        className="table-select"
                        disabled={isReadOnly}
                        title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                        value={doctor.departmentId}
                        onChange={(event) => void onAssignDoctor(doctor.doctorId, Number(event.target.value))}
                      >
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="secondary-button compact-action"
                        disabled={isReadOnly}
                        title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                        type="button"
                        onClick={() => void onChangeDoctorStatus(doctor, !doctor.isActive)}
                      >
                        {doctor.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <SkeletonRows count={5} />}
            {!loading && visibleDoctors.length === 0 && <EmptyState text="No doctors found." />}
          </>
        )}

        {tab === 'schedules' && (
          <>
            <div className="inline-form schedule-form">
              <label>
                Doctor
                <select value={scheduleDoctorId} onChange={(event) => setScheduleDoctorId(Number(event.target.value))}>
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input aria-label="Start hour" type="number" min="0" max="23" value={scheduleStartHour} onChange={(event) => setScheduleStartHour(event.target.value)} />
              </label>
              <label>
                End
                <input aria-label="End hour" type="number" min="1" max="24" value={scheduleEndHour} onChange={(event) => setScheduleEndHour(event.target.value)} />
              </label>
              <label>
                Slot
                <input aria-label="Slot duration" type="number" min="5" step="5" value={scheduleSlotDuration} onChange={(event) => setScheduleSlotDuration(event.target.value)} />
              </label>
              <button
                className="secondary-button"
                disabled={!scheduleDoctorId || Number(scheduleStartHour) >= Number(scheduleEndHour) || isReadOnly}
                title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                type="button"
                onClick={() => void onCreateSchedule(scheduleInput())}
              >
                Create Schedule
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Slot</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchedules.map((schedule) => {
                  const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
                  return (
                    <tr key={schedule.scheduleId}>
                      <td><strong>{doctor?.name ?? `Doctor ${schedule.doctorId}`}</strong></td>
                      <td>
                        {editingScheduleId === schedule.scheduleId ? (
                          <input className="table-input" type="number" min="0" max="23" value={editStartHour} onChange={(event) => setEditStartHour(event.target.value)} />
                        ) : (
                          formatTime(new Date(schedule.startTime))
                        )}
                      </td>
                      <td>
                        {editingScheduleId === schedule.scheduleId ? (
                          <input className="table-input" type="number" min="1" max="24" value={editEndHour} onChange={(event) => setEditEndHour(event.target.value)} />
                        ) : (
                          formatTime(new Date(schedule.endTime))
                        )}
                      </td>
                      <td>
                        {editingScheduleId === schedule.scheduleId ? (
                          <input className="table-input" type="number" min="5" step="5" value={editSlotDuration} onChange={(event) => setEditSlotDuration(event.target.value)} />
                        ) : (
                          `${schedule.slotDurationMin} min`
                        )}
                      </td>
                      <td>
                        {editingScheduleId === schedule.scheduleId ? (
                          <div className="table-actions">
                            <button
                              className="secondary-button compact-action"
                              disabled={Number(editStartHour) >= Number(editEndHour) || isReadOnly}
                              title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                              type="button"
                              onClick={() => {
                                void onChangeSchedule({
                                  ScheduleId: schedule.scheduleId,
                                  DoctorId: schedule.doctorId,
                                  StartHour: Number(editStartHour),
                                  EndHour: Number(editEndHour),
                                  SlotDurationMin: Number(editSlotDuration),
                                })
                                setEditingScheduleId(null)
                              }}
                            >
                              Save
                            </button>
                            <button className="secondary-button compact-action" type="button" onClick={() => setEditingScheduleId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="secondary-button compact-action"
                            disabled={isReadOnly}
                            title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                            type="button"
                            onClick={() => startScheduleEdit(schedule)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loading && <SkeletonRows count={5} />}
            {!loading && visibleSchedules.length === 0 && <EmptyState text="No schedules found." />}
          </>
        )}

        {tab === 'users' && (
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
        )}
      </section>

      <aside className="panel inspector-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inspector</p>
            <h2>{selectedDepartment?.name ?? 'Select department'}</h2>
          </div>
          <StatusBadge tone={selectedDepartment?.isActive ? 'success' : 'muted'}>
            {selectedDepartment?.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        </div>

        <div className="inspector-stats">
          <Metric label="Doctors" value={selectedDoctors.length} tone="blue" />
          <Metric label="Schedules" value={schedules.length} tone="green" />
          <Metric label="Users" value={users.length} tone="blue" />
        </div>

        <div className="section-label">Doctors</div>
        <div className="compact-list">
          {selectedDoctors.map((doctor) => (
            <div className="compact-row" key={doctor.doctorId}>
              <span className="doctor-avatar">{initials(doctor.name)}</span>
              <div>
                <strong>{doctor.name}</strong>
                <small>{doctor.isActive ? 'Active' : 'Inactive'}</small>
              </div>
            </div>
          ))}
          {!loading && selectedDoctors.length === 0 && <EmptyState text="No doctors assigned here." />}
        </div>

        <div className="stack">
          <button className="primary-button" type="button" onClick={() => onNavigate('doctors')}>
            Assign Doctor
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('schedules')}>
            Edit Schedule
          </button>
        </div>

        <div className="section-label activity-label">Recent activity</div>
        <div className="activity-list">
          {activity.map((entry) => (
            <div className="activity-row" key={entry.id}>
              <strong>{entry.message}</strong>
              <small>{formatTime(new Date(entry.at))}</small>
            </div>
          ))}
          {activity.length === 0 && <EmptyState text="No actions recorded in this browser yet." />}
        </div>
      </aside>
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: 'success' | 'muted' | 'blue' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function PageHint({ section }: { section: AdminSection }) {
  const copy: Record<AdminSection, string> = {
    departments: 'Create departments, activate service lines, and inspect coverage.',
    doctors: 'Assign doctors to departments and control active status.',
    schedules: 'Create and edit working hours and slot duration.',
    users: 'Create staff accounts, change roles, and reset passwords.',
  }

  return <p className="page-hint">{copy[section]}</p>
}

function Modal({
  children,
  title,
  tone,
  onClose,
}: {
  children: ReactNode
  title: string
  tone?: 'danger'
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal ${tone ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

function buildWeekSlots(
  schedule: ScheduleDto | undefined,
  doctorId: number | undefined,
  appointments: AppointmentDto[],
  weekOffset = 0,
): Slot[][] {
  const days = weekDays(weekOffset)

  if (!schedule || !doctorId) {
    return Array.from({ length: 5 }, (_, rowIndex) =>
      days.map((day) => ({ day, time: rowIndex === 0 ? 'No schedule' : '', status: 'empty' })),
    )
  }

  const startHour = new Date(schedule.startTime).getUTCHours()
  const endHour = new Date(schedule.endTime).getUTCHours()
  const duration = schedule.slotDurationMin || 30
  const times: string[] = []

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += duration) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }

  return times.map((time) =>
    days.map((day) => {
      const slotDate = dateAtTime(day, time)
      const appointment = appointments.find((item) => {
        const appointmentDate = new Date(item.appointmentTime)
        return (
          item.doctorId === doctorId &&
          appointmentDate.getFullYear() === slotDate.getFullYear() &&
          appointmentDate.getMonth() === slotDate.getMonth() &&
          appointmentDate.getDate() === slotDate.getDate() &&
          appointmentDate.getHours() === slotDate.getHours() &&
          appointmentDate.getMinutes() === slotDate.getMinutes()
        )
      })

      if (appointment?.status === 'Cancelled') return { day, time, status: 'cancelled', appointment }
      if (appointment) return { day, time, status: 'booked', appointment }
      if (slotDate.getTime() < Date.now()) return { day, time, status: 'past' }
      return { day, time, status: 'available' }
    }),
  )
}

function getNextAvailableSlot(slots: Slot[][]) {
  return slots
    .flat()
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => dateAtTime(left.day, left.time).getTime() - dateAtTime(right.day, right.time).getTime())[0]
}

function weekDays(weekOffset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

function dateAtTime(day: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  const date = new Date(day)
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date
}

function parseDateInput(value: string) {
  const [year = '0', month = '1', day = '1'] = value.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validateAppointmentInput(
  patientName: string,
  phoneNumber: string,
  dateOfBirth: string,
  appointmentTime: Date,
) {
  if (!patientName.trim()) return 'Patient name is required'
  if (!phoneNumber.trim()) return 'Phone number is required'

  const digitCount = Array.from(phoneNumber).filter((char) => /\d/.test(char)).length
  if (!/^\+?[0-9\s().-]+$/.test(phoneNumber) || digitCount < 7 || digitCount > 15) {
    return 'Phone number must contain 7 to 15 digits and no letters'
  }

  if (!dateOfBirth) return 'Date of birth is required'

  const birthDate = parseDateInput(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return 'Date of birth is invalid'
  if (birthDate.getTime() > appointmentTime.getTime()) {
    return 'Date of birth cannot be after the appointment date'
  }

  return null
}

function departmentName(departments: DepartmentDto[], id: number | undefined) {
  return departments.find((department) => department.id === id)?.name ?? 'Unassigned'
}

function coverageForDepartment(schedules: ScheduleDto[], doctors: DoctorDto[]) {
  const schedule = schedules.find((item) => doctors.some((doctor) => doctor.doctorId === item.doctorId))
  return schedule ? formatHourRange(schedule) : 'Unassigned'
}

function formatHourRange(schedule: ScheduleDto) {
  return `${formatTime(new Date(schedule.startTime))}-${formatTime(new Date(schedule.endTime))}`
}

function formatDay(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit' })
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatLongDate(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit' })
}

function formatTime(day: Date) {
  return day.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function initials(name: string) {
  const parts = name.replace(/^Dr\.\s*/i, '').split(' ').filter(Boolean)
  return `${parts[0]?.[0] ?? '?'}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

function slotLabel(status: SlotStatus) {
  if (status === 'available') return 'Available'
  if (status === 'booked') return 'Booked'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'past') return 'Past'
  return 'No schedule'
}

function adminTitle(section: AdminSection) {
  const titles: Record<AdminSection, string> = {
    departments: 'Departments',
    doctors: 'Doctors',
    schedules: 'Schedules',
    users: 'Users',
  }

  return titles[section]
}

function confirmAction(message: string) {
  return window.confirm(message)
}

export default App
