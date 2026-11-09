import type { AppointmentDto, DoctorDto, ScheduleDto } from '../../api/client'
import { useWorkspace } from '../../app/workspaceContext'
import { AppointmentHistory } from '../../components/AppointmentHistory'
import { addMinutes, longDate, mediumDate, relativeDay, timeOf } from '../../lib/dates'
import { personName } from '../../lib/names'
import { isMac } from '../../lib/platform'
import { canMarkAppointment, isUpcoming } from '../../lib/schedule'
import type { Slot } from '../../types'
import { Button, IconButton } from '../../ui/Button'
import { Kbd, Segmented, Status } from '../../ui/bits'
import { formatPhone } from '../../lib/phone'

export type WeekCounts = { booked: number; available: number; cancelled: number; capacity: number }

export function AppointmentDetails({
  appointment,
  schedule,
  now,
  framed = false,
  moving = false,
  onClose,
  onMove,
  onStopMoving,
  onCancel,
  onMark,
}: {
  appointment: AppointmentDto
  schedule: ScheduleDto | undefined
  now: number
  framed?: boolean
  moving?: boolean
  onClose?: () => void
  onStopMoving?: () => void
  onMove: (appointment: AppointmentDto) => void
  onCancel: (appointment: AppointmentDto) => void
  onMark: (appointment: AppointmentDto, status: 'Completed' | 'NoShow') => void
}) {
  const { readOnly, busy, go, doctorOf, departmentOf } = useWorkspace()
  const time = new Date(appointment.appointmentTime)
  const start = timeOf(time)
  const end = addMinutes(start, schedule?.slotDurationMin || 30)
  const upcoming = isUpcoming(appointment, now)
  const markable = canMarkAppointment(appointment, now)
  const department = departmentOf(doctorOf(appointment.doctorId)?.departmentId)
  const relative = relativeDay(time, now)

  return (
    <div className="appt">
      {!framed && (
        <div className="appt-top">
          <p className="pane-eyebrow">Appointment</p>
          {onClose && <IconButton icon="close" label="Close appointment" size="sm" onClick={onClose} />}
        </div>
      )}
      {!framed && <h2 className="appt-patient">{appointment.patientName}</h2>}
      <p className="appt-contact">
        <span className="mono">{appointment.patientPhoneNumber ? formatPhone(appointment.patientPhoneNumber) : 'No phone'}</span>
        <button className="link-btn" type="button" onClick={() => go('patients', { patient: appointment.patientId })}>
          Patient record
        </button>
      </p>

      <dl className="appt-facts">
        <div>
          <dt>When</dt>
          <dd>
            <span className="appt-date">
              {relative ? `${relative}, ` : ''}
              {longDate(time)}
            </span>
            <span className="appt-time mono">
              {start} – {end}
            </span>
          </dd>
        </div>
        <div>
          <dt>Doctor</dt>
          <dd>
            {personName(appointment.doctorName)}
            {department && <span className="appt-sub">{department.name}</span>}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <Status status={appointment.status} />
          </dd>
        </div>
      </dl>

      {upcoming && moving && (
        <div className="appt-moving">
          <p>Pick a new slot in the calendar. You can switch doctor or week first.</p>
          <Button size="sm" onClick={onStopMoving}>
            Stop moving
          </Button>
        </div>
      )}

      {upcoming && !moving && (
        <div className="appt-actions">
          <Button icon="move" locked={readOnly} onClick={() => onMove(appointment)}>
            Move
          </Button>
          <Button icon="slash" locked={readOnly} variant="danger" onClick={() => onCancel(appointment)}>
            Cancel booking
          </Button>
        </div>
      )}

      {markable && (
        <div className="appt-mark">
          <p className="appt-mark-label">
            {appointment.status === 'Scheduled' ? 'How did the visit go?' : 'Visit marked. Correct it if needed.'}
          </p>
          <Segmented
            disabled={readOnly || busy}
            label="Mark the visit"
            options={[
              { value: 'Completed', label: 'Completed' },
              { value: 'NoShow', label: 'No-show' },
            ]}
            value={appointment.status === 'Completed' || appointment.status === 'NoShow' ? appointment.status : null}
            onChange={(status) => onMark(appointment, status)}
          />
        </div>
      )}

      <AppointmentHistory appointment={appointment} hidden={readOnly} />
    </div>
  )
}

export function WeekSummary({
  doctor,
  counts,
  nextOpen,
  hasSchedule,
  weekOffset,
  onBook,
  onWeek,
}: {
  doctor: DoctorDto | null
  counts: WeekCounts
  nextOpen: Slot | undefined
  hasSchedule: boolean
  weekOffset: number
  onBook: (slot: Slot) => void
  onWeek: (offset: number) => void
}) {
  const { readOnly } = useWorkspace()
  const share = counts.capacity > 0 ? Math.round((counts.booked / counts.capacity) * 100) : 0
  const past = weekOffset < 0

  return (
    <div className="summary">
      {hasSchedule && (
        <div className="summary-load">
          <p className="pane-eyebrow">{past ? 'That week' : weekOffset === 0 ? 'This week' : 'That week'} at a glance</p>
          <div className="summary-load-top">
            <span className="summary-share display">{share}%</span>
            <span className="summary-share-label">of working slots {past ? 'were' : 'are'} booked</span>
          </div>
          <div aria-hidden="true" className="summary-bar">
            <span className="summary-bar-fill" style={{ width: `${share}%` }} />
          </div>
          <dl className="summary-counts">
            <div>
              <dt>Booked</dt>
              <dd className="num">{counts.booked}</dd>
            </div>
            <div>
              <dt>Open</dt>
              <dd className="num">{counts.available}</dd>
            </div>
            <div>
              <dt>Cancelled</dt>
              <dd className="num">{counts.cancelled}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="summary-next">
        <p className="pane-eyebrow">Next open slot</p>
        {nextOpen ? (
          <>
            <p className="summary-next-when">
              <span className="display">{mediumDate(nextOpen.day)}</span>
              <span className="mono">{nextOpen.time}</span>
            </p>
            <Button block iconAfter="arrow-right" locked={readOnly} variant="primary" onClick={() => onBook(nextOpen)}>
              Book this slot
            </Button>
          </>
        ) : (
          <>
            <p className="summary-none">
              {!doctor
                ? 'Choose a doctor first.'
                : !hasSchedule
                  ? 'This doctor has no working hours yet.'
                  : past
                    ? 'This week is over, so nothing here can be booked.'
                    : 'Nothing left open this week.'}
            </p>
            {doctor && hasSchedule && (
              <Button block iconAfter="arrow-right" onClick={() => onWeek(past ? 0 : weekOffset + 1)}>
                {past ? 'Go to this week' : 'Look at next week'}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="summary-legend">
        <p className="pane-eyebrow">Key</p>
        <ul>
          <li>
            <span className="key key-booked" /> Booked
          </li>
          <li>
            <span className="key key-completed" /> Completed
          </li>
          <li>
            <span className="key key-noshow" /> No-show
          </li>
          <li>
            <span className="key key-open" /> Open
          </li>
          <li>
            <span className="key key-hatch" /> Break or away
          </li>
          <li>
            <span className="key key-now" /> Now
          </li>
        </ul>
      </div>

      <div className="summary-keys">
        <p className="pane-eyebrow">Shortcuts</p>
        <ul>
          <li>
            <span className="keys">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
            </span>
            Previous or next week
          </li>
          <li>
            <span className="keys">
              <Kbd>T</Kbd>
            </span>
            Back to this week
          </li>
          <li>
            <span className="keys">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
            Find a patient or doctor
          </li>
          <li>
            <span className="keys">
              <Kbd>Esc</Kbd>
            </span>
            Close or stop moving
          </li>
        </ul>
      </div>
    </div>
  )
}
