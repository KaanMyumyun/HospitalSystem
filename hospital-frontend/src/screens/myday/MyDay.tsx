import { useEffect, useState } from 'react'
import { changeAppointmentStatus, loadMyAppointments } from '../../api/client'
import type { AppointmentDto } from '../../api/client'
import { useNow } from '../../app/hooks'
import { useResource } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate, clinicDayStart } from '../../lib/clinicTime'
import { dayOfMonth, longDate, relativeDay, timeOf, weekdayShort } from '../../lib/dates'
import { statusLabel } from '../../lib/format'
import { canMarkAppointment, dayStart, weekOffsetOf, weekRange } from '../../lib/schedule'
import type { ScreenProps } from '../../shell/Shell'
import { Button, IconButton } from '../../ui/Button'
import { Empty, LoadError, Segmented, Skeleton, Status } from '../../ui/bits'
import { PageHead } from '../../ui/Page'
import './myday.css'
import { formatPhone } from '../../lib/phone'

function until(target: number, now: number) {
  const minutes = Math.round((target - now) / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`
}

export function MyDay(_props: ScreenProps) {
  const { run, busy } = useWorkspace()
  const now = useNow(30_000)
  const [offset, setOffset] = useState(0)
  const day = dayStart(offset)
  const dayKey = clinicDate(day)
  const { from, to } = weekRange(weekOffsetOf(day))
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const week = useResource(`mine:${fromMs}`, (signal) => loadMyAppointments(new Date(fromMs), new Date(toMs), signal))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (document.querySelector('dialog[open]')) return
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('input, textarea, select, [role="radiogroup"]')) return
      if (event.key === 'ArrowLeft') setOffset((value) => value - 1)
      else if (event.key === 'ArrowRight') setOffset((value) => value + 1)
      else if (event.key === 't' || event.key === 'T') setOffset(0)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const days = Array.from({ length: 7 }, (_, index) => clinicDayStart(from, index))
  const all = week.data ?? []
  const onDay = (date: string) => all.filter((item) => clinicDate(new Date(item.appointmentTime)) === date)
  const appointments = onDay(dayKey)
  const active = appointments.filter((item) => item.status !== 'Cancelled')
  const seen = active.filter((item) => item.status === 'Completed').length
  const missed = active.filter((item) => item.status === 'NoShow').length
  const next = active.find((item) => item.status === 'Scheduled' && new Date(item.appointmentTime).getTime() > now)
  const unmarked = active.filter((item) => item.status === 'Scheduled' && new Date(item.appointmentTime).getTime() <= now).length
  const isToday = dayKey === clinicDate(now)
  const relative = relativeDay(day, now)
  const todayOffsetOf = (target: Date) =>
    Math.round((clinicDayStart(target).getTime() - clinicDayStart(now).getTime()) / (24 * 60 * 60_000))

  const mark = (appointment: AppointmentDto, status: 'Completed' | 'NoShow') =>
    void run(
      () => changeAppointmentStatus(appointment.appointmentId, status),
      `${appointment.patientName} marked ${statusLabel(status).toLowerCase()}`,
    )

  const nowIndex = isToday
    ? appointments.findIndex((item) => new Date(item.appointmentTime).getTime() > now)
    : -1

  return (
    <div className="page myday">
      <PageHead
        actions={
          <div className="day-nav">
            <IconButton icon="chevron-left" label="Previous day" variant="quiet" onClick={() => setOffset((value) => value - 1)} />
            <Button disabled={offset === 0} size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
            <IconButton icon="chevron-right" label="Next day" variant="quiet" onClick={() => setOffset((value) => value + 1)} />
          </div>
        }
        kicker={relative ?? 'My day'}
        title={longDate(day)}
      />

      <div className="page-body">
        <nav aria-label="Days this week" className="week-days">
          {days.map((date) => {
            const key = clinicDate(date)
            const count = onDay(key).filter((item) => item.status !== 'Cancelled').length
            return (
              <button
                aria-current={key === dayKey ? 'date' : undefined}
                className={`week-day${key === clinicDate(now) ? ' is-today' : ''}`}
                key={key}
                type="button"
                onClick={() => setOffset(todayOffsetOf(date))}
              >
                <span className="week-day-name">{weekdayShort(date)}</span>
                <span className="week-day-number">{dayOfMonth(date)}</span>
                <span className="week-day-count">
                  {week.data ? (count === 0 ? '—' : `${count} ${count === 1 ? 'patient' : 'patients'}`) : '·'}
                </span>
              </button>
            )
          })}
        </nav>

        {week.error && !week.data ? (
          <LoadError message={week.error} onRetry={() => void week.reload()} />
        ) : !week.data ? (
          <Skeleton className="agenda-skeleton" lines={6} />
        ) : appointments.length === 0 ? (
          <Empty size="lg" title={isToday ? 'Nothing booked today' : 'Nothing booked this day'}>
            New bookings from the front desk appear here as they are made.
          </Empty>
        ) : (
          <>
            <p className="agenda-summary">
              <span>
                <strong>{active.length}</strong> {active.length === 1 ? 'patient' : 'patients'}
              </span>
              {seen > 0 && (
                <span>
                  <strong>{seen}</strong> seen
                </span>
              )}
              {missed > 0 && (
                <span>
                  <strong>{missed}</strong> no-show{missed === 1 ? '' : 's'}
                </span>
              )}
              {unmarked > 0 && (
                <span className="agenda-attention">
                  <strong>{unmarked}</strong> to mark
                </span>
              )}
              {next && (
                <span>
                  Next at <strong className="mono">{timeOf(new Date(next.appointmentTime))}</strong>,{' '}
                  {until(new Date(next.appointmentTime).getTime(), now)}
                </span>
              )}
            </p>

            <ol className="agenda">
              {appointments.map((item, index) => {
                const time = new Date(item.appointmentTime)
                const started = time.getTime() <= now
                const markable = canMarkAppointment(item, now)
                return (
                  <li
                    className={`agenda-item is-${item.status.toLowerCase()}${item === next ? ' is-next' : ''}${
                      started && item.status === 'Scheduled' ? ' is-unmarked' : ''
                    }`}
                    data-now={index === nowIndex ? 'before' : undefined}
                    key={item.appointmentId}
                  >
                    {index === nowIndex && (
                      <span aria-hidden="true" className="agenda-now">
                        <span className="mono">{timeOf(now)}</span>
                      </span>
                    )}
                    <span className="agenda-time mono">{timeOf(time)}</span>
                    <span aria-hidden="true" className="agenda-dot" />
                    <div className="agenda-patient">
                      <p className="agenda-name">{item.patientName}</p>
                      <p className="agenda-phone mono">{formatPhone(item.patientPhoneNumber)}</p>
                    </div>
                    <div className="agenda-side">
                      {item === next ? (
                        <span className="tag tag-accent">Next · {until(time.getTime(), now)}</span>
                      ) : markable ? (
                        <Segmented
                          disabled={busy}
                          label={`Mark ${item.patientName}'s visit`}
                          options={[
                            { value: 'Completed', label: 'Seen' },
                            { value: 'NoShow', label: 'No-show' },
                          ]}
                          size="sm"
                          value={item.status === 'Completed' || item.status === 'NoShow' ? item.status : null}
                          onChange={(status) => mark(item, status)}
                        />
                      ) : (
                        <Status status={item.status} />
                      )}
                    </div>
                  </li>
                )
              })}
              {nowIndex === -1 && isToday && appointments.length > 0 && (
                <li aria-hidden="true" className="agenda-now agenda-now-end">
                  <span className="mono">{timeOf(now)}</span>
                </li>
              )}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
