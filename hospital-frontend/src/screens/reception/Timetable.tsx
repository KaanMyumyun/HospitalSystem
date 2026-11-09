import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { AppointmentDto, ScheduleDto } from '../../api/client'
import { clinicDate } from '../../lib/clinicTime'
import { dayOfMonth, longDate, minutesOfDay, relativeDay, timeOf, weekdayShort } from '../../lib/dates'
import { statusLabel } from '../../lib/format'
import { scheduleWindow } from '../../lib/time'
import type { Slot } from '../../types'

const arrows: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function density(schedule: ScheduleDto | undefined) {
  const minutes = schedule?.slotDurationMin ?? 30
  if (minutes <= 15) return 'compact'
  if (minutes <= 20) return 'cozy'
  return 'roomy'
}

function isInteractive(slot: Slot) {
  return slot.appointment !== undefined || slot.status === 'available'
}

function awayReason(schedule: ScheduleDto | undefined, day: Date) {
  const date = clinicDate(day)
  return schedule?.timeOff.find((timeOff) => timeOff.firstDay <= date && date <= timeOff.lastDay)?.reason ?? null
}

export function Timetable({
  days,
  slots,
  schedule,
  moving,
  selectedId,
  now,
  onPick,
}: {
  days: Date[]
  slots: Slot[][]
  schedule: ScheduleDto | undefined
  moving: AppointmentDto | null
  selectedId: number | null
  now: number
  onPick: (slot: Slot) => void
}) {
  const grid = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null)
  const columns = days.length
  const today = clinicDate(now)
  const todayIndex = days.findIndex((day) => clinicDate(day) === today)
  const hours = schedule ? scheduleWindow(schedule) : null
  const duration = schedule?.slotDurationMin || 30
  const nowMinutes = minutesOfDay(now)
  const nowRows =
    hours && todayIndex >= 0 && nowMinutes >= hours.startMinutes && nowMinutes < hours.endMinutes
      ? (nowMinutes - hours.startMinutes) / duration
      : null

  const firstRow = (column: number, status: Slot['status']) =>
    slots.findIndex((row) => row[column]?.status === status)

  const selectedPosition = (() => {
    for (let r = 0; r < slots.length; r++) {
      const c = slots[r]?.findIndex((slot) => slot.appointment?.appointmentId === selectedId) ?? -1
      if (c >= 0 && selectedId !== null) return { r, c }
    }
    return null
  })()
  const firstInteractive = (() => {
    for (let r = 0; r < slots.length; r++) {
      const c = slots[r]?.findIndex(isInteractive) ?? -1
      if (c >= 0) return { r, c }
    }
    return null
  })()
  const focusValid = focus && slots[focus.r]?.[focus.c] && isInteractive(slots[focus.r]![focus.c]!)
  const tabStop = (focusValid ? focus : null) ?? selectedPosition ?? firstInteractive

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = arrows[event.key]
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-r]') : null
    if (!target) return
    let r = Number(target.dataset.r)
    let c = Number(target.dataset.c)
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const row = slots[r] ?? []
      const order = event.key === 'Home' ? row.map((_, index) => index) : row.map((_, index) => row.length - 1 - index)
      for (const index of order) {
        if (row[index] && isInteractive(row[index]!)) return moveTo(r, index)
      }
      return
    }
    if (!step) return
    event.preventDefault()
    for (let guard = 0; guard < 400; guard++) {
      r += step[0]
      c += step[1]
      if (r < 0 || r >= slots.length || c < 0 || c >= columns) return
      const slot = slots[r]?.[c]
      if (slot && isInteractive(slot)) return moveTo(r, c)
    }
  }

  const moveTo = (r: number, c: number) => {
    setFocus({ r, c })
    grid.current?.querySelector<HTMLButtonElement>(`button[data-r="${r}"][data-c="${c}"]`)?.focus()
  }

  return (
    <div
      aria-label="Week timetable. Use the arrow keys to move between slots."
      aria-colcount={columns + 1}
      aria-rowcount={slots.length + 1}
      className="timetable"
      data-columns={columns}
      data-density={density(schedule)}
      ref={grid}
      role="grid"
      style={{ '--cols': columns } as CSSProperties}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="tt-row tt-head" role="row">
        <div className="tt-corner" role="columnheader">
          <span className="visually-hidden">Time</span>
        </div>
        {days.map((day, index) => {
          const isToday = index === todayIndex
          const away = schedule ? awayReason(schedule, day) !== null || slots.some((row) => row[index]?.status === 'away') : false
          const off = schedule ? !schedule.workingDays.some((name) => name === dayNameOf(day)) : false
          const label = relativeDay(day, now)
          return (
            <div
              aria-label={longDate(day)}
              className={`tt-day${isToday ? ' is-today' : ''}`}
              key={day.toISOString()}
              role="columnheader"
            >
              <span className="tt-day-name">
                {weekdayShort(day)}
                {label === 'Today' && <span className="tt-today">Today</span>}
              </span>
              <span className="tt-day-number">{dayOfMonth(day)}</span>
              {away ? <span className="tt-day-flag tt-flag-away">Away</span> : off ? <span className="tt-day-flag">Off</span> : null}
            </div>
          )
        })}
      </div>

      <div className="tt-body">
        {slots.map((row, r) => {
          const time = row.find((slot) => slot.time)?.time ?? ''
          const isBreak = row.length > 0 && row.every((slot) => slot.status === 'break' || slot.status === 'off' || slot.status === 'away' || slot.status === 'past')
            && row.some((slot) => slot.status === 'break')
          return (
            <div className={`tt-row${isBreak ? ' is-break' : ''}`} key={time || r} role="row">
              <div className="tt-time mono" role="rowheader">
                {time}
              </div>
              {row.map((slot, c) => {
                const appointment = slot.appointment
                const unmarked =
                  appointment?.status === 'Scheduled' && new Date(appointment.appointmentTime).getTime() <= now
                const content = cellContent(slot, {
                  moving,
                  firstOfKind: firstRow(c, slot.status) === r,
                  reason: slot.status === 'away' ? awayReason(schedule, slot.day) : null,
                  unmarked,
                })
                const kind = appointment ? appointment.status.toLowerCase() : slot.status
                const classes = [
                  'tt-cell',
                  `is-${slot.status}`,
                  appointment ? `appt-${kind}` : '',
                  unmarked ? 'is-unmarked' : '',
                  c === todayIndex ? 'is-today' : '',
                  appointment && appointment.appointmentId === selectedId ? 'is-selected' : '',
                  moving && slot.status === 'available' ? 'is-target' : '',
                  moving && appointment?.appointmentId === moving.appointmentId ? 'is-moving' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                const accessible = `${longDate(slot.day)}, ${slot.time}: ${content.label}`
                return (
                  <div className={classes} key={`${slot.day.toISOString()}-${slot.time}`} role="gridcell">
                    {isInteractive(slot) ? (
                      <button
                        aria-label={accessible}
                        aria-pressed={appointment ? appointment.appointmentId === selectedId : undefined}
                        className="tt-slot"
                        data-c={c}
                        data-r={r}
                        tabIndex={tabStop?.r === r && tabStop.c === c ? 0 : -1}
                        type="button"
                        onClick={() => {
                          setFocus({ r, c })
                          onPick(slot)
                        }}
                      >
                        {content.body}
                      </button>
                    ) : (
                      <span aria-label={accessible} className="tt-static" role="img">
                        {content.body}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
        {nowRows !== null && (
          <>
            <span aria-hidden="true" className="tt-now-time mono" style={{ top: `calc(var(--row-h) * ${nowRows})` }}>
              {timeOf(now)}
            </span>
            <span
              aria-hidden="true"
              className="tt-now"
              style={{
                top: `calc(var(--row-h) * ${nowRows})`,
                left: `calc(var(--time-col) + (100% - var(--time-col)) * ${todayIndex} / ${columns})`,
                width: `calc((100% - var(--time-col)) / ${columns})`,
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function dayNameOf(day: Date) {
  const index = new Date(`${clinicDate(day)}T12:00:00Z`).getUTCDay()
  return dayNames[index] ?? 'Sunday'
}

function cellContent(
  slot: Slot,
  context: { moving: AppointmentDto | null; firstOfKind: boolean; reason: string | null; unmarked: boolean },
): { body: ReactNode; label: string } {
  const appointment = slot.appointment
  if (appointment && slot.status === 'booked') {
    const note = context.unmarked ? 'Not marked' : appointment.status === 'Scheduled' ? null : statusLabel(appointment.status)
    return {
      label: `${appointment.patientName}, ${context.unmarked ? 'visit not marked yet' : statusLabel(appointment.status).toLowerCase()}`,
      body: (
        <>
          <span className="tt-name">{appointment.patientName}</span>
          {note && <span className="tt-note">{note}</span>}
          {(note || context.unmarked) && <span aria-hidden="true" className="tt-glyph" />}
        </>
      ),
    }
  }
  if (appointment && slot.status === 'cancelled') {
    return {
      label: `${appointment.patientName}, cancelled`,
      body: (
        <>
          <span className="tt-name">{appointment.patientName}</span>
          <span className="tt-note">Cancelled</span>
        </>
      ),
    }
  }
  switch (slot.status) {
    case 'available':
      return context.moving
        ? { label: 'open, move here', body: <span className="tt-hint">Move here</span> }
        : { label: 'open', body: <span className="tt-hint">Book</span> }
    case 'break':
      return { label: 'break', body: context.firstOfKind ? <span className="tt-label">Break</span> : null }
    case 'away':
      return {
        label: context.reason ? `away, ${context.reason}` : 'away',
        body: context.firstOfKind ? (
          <span className="tt-label">
            Away{context.reason ? <span className="tt-reason">{context.reason}</span> : null}
          </span>
        ) : null,
      }
    case 'off':
      return { label: 'not a working day', body: context.firstOfKind ? <span className="tt-label">Not working</span> : null }
    case 'loading':
      return { label: 'loading', body: <span className="tt-loading" /> }
    case 'past':
      return { label: 'past, not booked', body: null }
    default:
      return { label: 'no schedule', body: null }
  }
}
