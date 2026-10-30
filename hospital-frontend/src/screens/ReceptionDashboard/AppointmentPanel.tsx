import type { AppointmentDto, DoctorDto } from '../../api'
import { AppointmentHistory } from '../../components/AppointmentHistory'
import { EmptyState, GuardedButton, StatusBadge } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { formatLongDate, formatTime, initials, statusLabel } from '../../lib/format'
import { canMarkAppointment, isUpcoming } from '../../lib/schedule'
import type { Slot } from '../../types'

export function AppointmentPanel({
  appointment,
  doctor,
  moving,
  nextAvailableSlot,
  onBookSlot,
  onCancel,
  onMark,
  onStartMove,
}: {
  appointment: AppointmentDto | null
  doctor: DoctorDto | null
  moving: AppointmentDto | null
  nextAvailableSlot: Slot | null | undefined
  onBookSlot: (slot: Slot) => void
  onCancel: (appointment: AppointmentDto) => void
  onMark: (appointmentId: number, status: 'Completed' | 'NoShow') => void
  onStartMove: (appointment: AppointmentDto) => void
}) {
  const { isReadOnly, loading } = useWorkspace()
  const canChange = appointment !== null && isUpcoming(appointment)

  return (
    <aside className="panel details-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected</p>
          <h2>Appointment</h2>
        </div>
        <StatusBadge tone={appointment ? 'blue' : 'muted'}>
          {appointment ? statusLabel(appointment.status) : 'None'}
        </StatusBadge>
      </div>

      {appointment ? (
        <>
          <div className="patient-card">
            <span className="patient-avatar">{initials(appointment.patientName)}</span>
            <div>
              <strong>{appointment.patientName}</strong>
              <small>Patient ID {appointment.patientId}</small>
            </div>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Doctor</dt>
              <dd>{appointment.doctorName || doctor?.name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatLongDate(new Date(appointment.appointmentTime))}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{formatTime(new Date(appointment.appointmentTime))}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(appointment.status)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{appointment.patientPhoneNumber || 'Not provided'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <EmptyState text="Choose a booked slot to view appointment details." />
      )}

      <div className="stack">
        <GuardedButton
          className="primary-button"
          readOnly={isReadOnly}
          disabled={!nextAvailableSlot || moving !== null}
          onClick={() => {
            if (nextAvailableSlot) onBookSlot(nextAvailableSlot)
          }}
        >
          Book Next Available
        </GuardedButton>
        <GuardedButton
          className="secondary-button"
          readOnly={isReadOnly}
          disabled={!canChange}
          onClick={() => {
            if (appointment) onStartMove(appointment)
          }}
        >
          Move Appointment
        </GuardedButton>
        <GuardedButton
          className="secondary-button danger"
          readOnly={isReadOnly}
          disabled={!canChange}
          onClick={() => {
            if (appointment) onCancel(appointment)
          }}
        >
          Cancel Appointment
        </GuardedButton>
        {appointment && canMarkAppointment(appointment) && (
          <>
            <GuardedButton
              className="secondary-button"
              readOnly={isReadOnly}
              disabled={appointment.status === 'Completed' || loading}
              onClick={() => onMark(appointment.appointmentId, 'Completed')}
            >
              Mark completed
            </GuardedButton>
            <GuardedButton
              className="secondary-button"
              readOnly={isReadOnly}
              disabled={appointment.status === 'NoShow' || loading}
              onClick={() => onMark(appointment.appointmentId, 'NoShow')}
            >
              Mark no-show
            </GuardedButton>
          </>
        )}
      </div>

      {appointment && <AppointmentHistory appointment={appointment} hidden={isReadOnly} />}
    </aside>
  )
}
