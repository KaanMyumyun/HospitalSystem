import { useEffect, useMemo, useState } from 'react'
import type { AppointmentDto, CreateAppointmentInput, DepartmentDto, DoctorDto, ScheduleDto } from '../api'
import { EmptyState, Metric, Modal, StatusBadge } from '../components/ui'
import {
  departmentName,
  formatDay,
  formatHourRange,
  formatLongDate,
  formatTime,
  initials,
  isSameDay,
  slotLabel,
} from '../lib/format'
import { buildWeekSlots, canCancelAppointment, dateAtTime, getNextAvailableSlot, isInWeek, weekDays } from '../lib/schedule'
import { toDateInputValue, validateAppointmentInput } from '../lib/validation'
import type { ActionOutcome, Slot } from '../types'

export function ReceptionDashboard({
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
  onCancelAppointment: (appointmentId: number, reason: string) => Promise<ActionOutcome>
  onCreateAppointment: (input: CreateAppointmentInput) => Promise<ActionOutcome>
  onSelectDoctor: (doctorId: number) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  // Selecting a booked slot shows its details; cancelling is a separate step.
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<number | null>(null)
  const [patientName, setPatientName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
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
    const firstActiveDoctor = activeDoctors[0]
    if (firstActiveDoctor && !activeDoctors.some((doctor) => doctor.doctorId === selectedDoctorId)) {
      onSelectDoctor(firstActiveDoctor.doctorId)
    }
  }, [activeDoctors, onSelectDoctor, selectedDoctorId])
  const selectedSchedule = schedules.find((schedule) => schedule.doctorId === selectedDoctor?.doctorId)
  const slots = useMemo(
    () => buildWeekSlots(selectedSchedule, selectedDoctor?.doctorId, appointments, weekOffset),
    [appointments, selectedDoctor?.doctorId, selectedSchedule, weekOffset],
  )
  const nextAvailableSlot = useMemo(() => getNextAvailableSlot(slots), [slots])
  const visibleAppointment = appointments.find((appointment) => appointment.appointmentId === selectedAppointmentId) ?? null
  const cancellingAppointment =
    appointments.find((appointment) => appointment.appointmentId === cancellingAppointmentId) ?? null
  const counts = {
    booked: slots.flat().filter((slot) => slot.status === 'booked').length,
    available: slots.flat().filter((slot) => slot.status === 'available').length,
    cancelled: appointments.filter(
      (appointment) =>
        appointment.doctorId === selectedDoctor?.doctorId &&
        appointment.status === 'Cancelled' &&
        isInWeek(new Date(appointment.appointmentTime), weekOffset),
    ).length,
  }
  const closeBooking = () => {
    setSelectedSlot(null)
    setPatientName('')
    setPhoneNumber('')
    setDateOfBirth('')
    setBookingError(null)
  }
  const closeCancellation = () => {
    setCancellingAppointmentId(null)
    setCancelReason('')
    setCancelError(null)
  }
  const submitBooking = async () => {
    if (!selectedSlot || !selectedDoctor) return
    const appointmentTime = dateAtTime(selectedSlot.day, selectedSlot.time)
    const validationError = validateAppointmentInput(patientName, phoneNumber, dateOfBirth, appointmentTime)
    if (validationError) {
      setBookingError(validationError)
      return
    }

    const outcome = await onCreateAppointment({
      DoctorId: selectedDoctor.doctorId,
      PatientName: patientName.trim(),
      PhoneNumber: phoneNumber.trim(),
      DateOfBirth: dateOfBirth,
      AppointmentTime: appointmentTime.toISOString(),
    })
    // Keep the dialog and what was typed if the booking failed.
    if (!outcome.ok) {
      if (outcome.error) setBookingError(outcome.error)
      return
    }
    closeBooking()
  }
  const submitCancellation = async () => {
    if (!cancellingAppointment) return
    const outcome = await onCancelAppointment(cancellingAppointment.appointmentId, cancelReason)
    if (!outcome.ok) {
      if (outcome.error) setCancelError(outcome.error)
      return
    }
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
                        setSelectedAppointmentId(slot.appointment.appointmentId)
                        return
                      }
                      if (slot.status === 'available') setSelectedSlot(slot)
                    }}
                    type="button"
                    key={`${slot.day.toISOString()}-${slot.time}`}
                  >
                    <span>{slot.time}</span>
                    {/* Initials only: the grid is visible to anyone near the desk. */}
                    <small>
                      {slot.status === 'booked' && slot.appointment
                        ? initials(slot.appointment.patientName)
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
                <dd>{visibleAppointment.doctorName || selectedDoctor?.name}</dd>
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
            onClick={() => setSelectedSlot(nextAvailableSlot ?? null)}
          >
            Book Next Available
          </button>
          <button
            className="secondary-button danger"
            disabled={!visibleAppointment || !canCancelAppointment(visibleAppointment) || isReadOnly}
            title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
            type="button"
            onClick={() => {
              if (visibleAppointment) setCancellingAppointmentId(visibleAppointment.appointmentId)
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
                maxLength={50}
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
                maxLength={20}
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
              disabled={!patientName || !phoneNumber || !dateOfBirth || isReadOnly || loading}
              title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
              type="button"
              onClick={() => void submitBooking()}
            >
              Confirm Booking
            </button>
          </div>
        </Modal>
      )}

      {cancellingAppointment && (
        <Modal title="Cancel appointment" tone="danger" onClose={closeCancellation}>
          <div className="summary-box danger">
            <strong>{cancellingAppointment.patientName}</strong>
            <span>{formatLongDate(new Date(cancellingAppointment.appointmentTime))}</span>
          </div>
          <div className="form-grid">
            <label>
              Cancellation Reason
              <textarea
                maxLength={500}
                value={cancelReason}
                onChange={(event) => {
                  setCancelError(null)
                  setCancelReason(event.target.value)
                }}
              />
            </label>
          </div>
          {cancelError && <div className="form-error">{cancelError}</div>}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={closeCancellation}>
              Keep Appointment
            </button>
            <button
              className="secondary-button danger"
              disabled={!cancelReason.trim() || isReadOnly || loading}
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
