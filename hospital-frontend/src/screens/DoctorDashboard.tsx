import { useCallback, useEffect, useRef, useState } from 'react'
import { loadMyAppointments } from '../api'
import type { AppointmentDto } from '../api'
import { EmptyState, SkeletonRows, StatusBadge } from '../components/ui'
import { useWorkspace } from '../hooks/useWorkspace'
import { clinicDayStart } from '../lib/clinicTime'
import { formatLongDate, formatTime, statusLabel } from '../lib/format'
import { canMarkAppointment, dayStart } from '../lib/schedule'
import type { ActionOutcome } from '../types'

// A doctor's own appointments, one day at a time, marked as they happen.
export function DoctorDashboard({
  onChangeAppointmentStatus,
}: {
  onChangeAppointmentStatus: (appointmentId: number, status: 'Completed' | 'NoShow') => Promise<ActionOutcome>
}) {
  const { loading, onError } = useWorkspace()
  const [dayOffset, setDayOffset] = useState(0)
  const { day, appointments, reload } = useDayAppointments(dayOffset, onError)

  const mark = async (appointmentId: number, status: 'Completed' | 'NoShow') => {
    if ((await onChangeAppointmentStatus(appointmentId, status)).ok) await reload()
  }

  const scheduled = appointments?.filter((appointment) => appointment.status !== 'Cancelled') ?? []

  return (
    <section className="screen-grid doctor-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">My day</p>
            <h2>{formatLongDate(day)}</h2>
            <p className="subtle">
              {appointments === null ? 'Loading...' : `${scheduled.length} appointment${scheduled.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="toolbar calendar-toolbar">
          <button className="secondary-button" type="button" onClick={() => setDayOffset((value) => value - 1)}>
            Previous Day
          </button>
          <button className="secondary-button" type="button" onClick={() => setDayOffset(0)}>
            Today
          </button>
          <button className="secondary-button" type="button" onClick={() => setDayOffset((value) => value + 1)}>
            Next Day
          </button>
        </div>

        {appointments === null && <SkeletonRows count={5} />}
        {appointments?.length === 0 && <EmptyState text="No appointments on this day." />}
        <ul className="day-list">
          {(appointments ?? []).map((appointment) => (
            <li className={`day-row ${appointment.status.toLowerCase()}`} key={appointment.appointmentId}>
              <strong className="day-time">{formatTime(new Date(appointment.appointmentTime))}</strong>
              <span>
                <strong>{appointment.patientName}</strong>
                <small>{appointment.patientPhoneNumber}</small>
              </span>
              <StatusBadge tone={appointment.status === 'Completed' ? 'success' : appointment.status === 'Scheduled' ? 'blue' : 'muted'}>
                {statusLabel(appointment.status)}
              </StatusBadge>
              {canMarkAppointment(appointment) && (
                <div className="button-pair">
                  <button
                    className="secondary-button compact-action"
                    disabled={appointment.status === 'Completed' || loading}
                    type="button"
                    onClick={() => void mark(appointment.appointmentId, 'Completed')}
                  >
                    Completed
                  </button>
                  <button
                    className="secondary-button compact-action"
                    disabled={appointment.status === 'NoShow' || loading}
                    type="button"
                    onClick={() => void mark(appointment.appointmentId, 'NoShow')}
                  >
                    No-show
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

type LoadedDay = { fromMs: number; appointments: AppointmentDto[] }

// The day dayOffset days from today, and the signed-in doctor's appointments
// in it; null until they load. onError must keep the same identity.
function useDayAppointments(dayOffset: number, onError: (message: string) => void) {
  // From the clock each render, so a page left open past midnight moves on.
  const day = dayStart(dayOffset)
  const fromMs = day.getTime()
  const [loaded, setLoaded] = useState<LoadedDay | null>(null)
  const latestRequest = useRef<symbol | null>(null)

  const reload = useCallback(async () => {
    const request = Symbol()
    latestRequest.current = request
    const from = new Date(fromMs)

    return loadMyAppointments(from, clinicDayStart(from, 1)).then(
      (appointments) => {
        if (request === latestRequest.current) setLoaded({ fromMs, appointments })
      },
      (error: unknown) => {
        if (request === latestRequest.current) {
          onError(error instanceof Error ? error.message : 'Failed to load your appointments')
        }
      },
    )
  }, [fromMs, onError])

  useEffect(() => {
    void reload()
    return () => { latestRequest.current = null }
  }, [reload])

  return { day, appointments: loaded?.fromMs === fromMs ? loaded.appointments : null, reload }
}
