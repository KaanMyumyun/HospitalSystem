import type { Dispatch, SetStateAction } from 'react'
import type { AppointmentDto, DoctorDto, ScheduleDto } from '../../api'
import { Metric } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import {
  departmentName,
  formatDay,
  formatHourRange,
  formatLongDate,
  formatTime,
  formatWorkingDays,
  initials,
  isToday,
  slotLabel,
} from '../../lib/format'
import type { Slot } from '../../types'

export type WeekCounts = { booked: number; available: number; cancelled: number }

export function WeekCalendar({
  counts,
  days,
  doctor,
  moving,
  schedule,
  slots,
  onChooseSlot,
  onStopMoving,
  onWeekOffsetChange,
}: {
  counts: WeekCounts
  days: Date[]
  doctor: DoctorDto | null
  moving: AppointmentDto | null
  schedule: ScheduleDto | undefined
  slots: Slot[][]
  onChooseSlot: (slot: Slot) => void
  onStopMoving: () => void
  onWeekOffsetChange: Dispatch<SetStateAction<number>>
}) {
  const { departments } = useWorkspace()

  return (
    <section className="panel schedule-panel">
      <div className="panel-heading schedule-title-row">
        <div>
          <p className="eyebrow">Weekly calendar</p>
          <h2>{doctor?.name ?? 'Select a doctor'}</h2>
          <p className="subtle">
            {schedule
              ? `${departmentName(departments, doctor?.departmentId)} · ${schedule.slotDurationMin} min slots · ${formatHourRange(schedule)} · ${formatWorkingDays(schedule.workingDays)}`
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
        <button className="secondary-button" type="button" onClick={() => onWeekOffsetChange((value) => value - 1)}>
          Previous Week
        </button>
        <button className="secondary-button" type="button" onClick={() => onWeekOffsetChange(0)}>
          Current Week
        </button>
        <button className="secondary-button" type="button" onClick={() => onWeekOffsetChange((value) => value + 1)}>
          Next Week
        </button>
      </div>

      {moving && (
        <div className="move-banner" role="status">
          <span>
            Moving <strong>{moving.patientName}</strong> from{' '}
            {formatLongDate(new Date(moving.appointmentTime))} at {formatTime(new Date(moving.appointmentTime))}.
            Choose an open slot; another doctor or week works too.
          </span>
          <button className="secondary-button" type="button" onClick={onStopMoving}>
            Stop moving
          </button>
        </div>
      )}

      <div className="schedule-scroll">
        <div className={`schedule-grid days-${days.length}`} role="group" aria-label="Weekly appointment schedule">
          <div className="grid-corner" aria-hidden="true">Time</div>
          {days.map((day) => {
            const today = isToday(day)
            return (
              <div className={`day-cell ${today ? 'today' : ''}`} aria-hidden="true" key={day.toISOString()}>
                {formatDay(day)}
                {today ? <small>Today</small> : null}
              </div>
            )
          })}
          {slots.map((row, rowIndex) =>
            [
              <div className="time-cell" aria-hidden="true" key={`time-${rowIndex}`}>
                {row.find((slot) => slot.time)?.time ?? ''}
              </div>,
              ...row.map((slot) => {
                const isMoveTarget = moving !== null && slot.status === 'available'
                const text = slotText(slot, isMoveTarget)
                return (
                  <button
                    aria-label={`${formatLongDate(slot.day)} at ${slot.time}: ${text}`}
                    className={`slot-cell ${slot.status} ${slot.appointment ? `appointment-${slot.appointment.status.toLowerCase()}` : ''} ${isMoveTarget ? 'move-target' : ''}`}
                    disabled={!slot.appointment && slot.status !== 'available'}
                    onClick={() => onChooseSlot(slot)}
                    type="button"
                    key={`${slot.day.toISOString()}-${slot.time}`}
                  >
                    <span>{slot.time}</span>
                    <small>{text}</small>
                  </button>
                )
              }),
            ],
          )}
        </div>
      </div>
    </section>
  )
}

function slotText(slot: Slot, isMoveTarget: boolean) {
  if (isMoveTarget) return 'Move here'
  if (slot.status === 'booked' && slot.appointment) {
    return `${initials(slot.appointment.patientName)}${attendanceLabel(slot.appointment.status)}`
  }
  return slotLabel(slot.status)
}

function attendanceLabel(status: AppointmentDto['status']) {
  if (status === 'Completed') return ' · done'
  if (status === 'NoShow') return ' · no-show'
  return ''
}
