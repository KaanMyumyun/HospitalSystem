import { useEffect, useState } from 'react'
import { loadAppointmentHistory } from '../api'
import type { AppointmentDto, AppointmentHistoryEntryDto } from '../api'
import { formatLongDate, formatTime, historyActionLabel } from '../lib/format'
import { EmptyState, SkeletonRows } from './ui'

type Loaded = { version: string; entries: AppointmentHistoryEntryDto[] } | { version: string; error: string }

// Who booked, moved, cancelled or marked the booking, and when. It names the
// staff who did, so demo accounts do not get it.
export function AppointmentHistory({ appointment, hidden }: { appointment: AppointmentDto; hidden: boolean }) {
  const { appointmentId } = appointment
  // Changes with the booking, so a move or a mark loads the history again.
  const version = `${appointmentId} ${appointment.status} ${appointment.appointmentTime} ${appointment.doctorId}`
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (hidden) return
    let current = true
    loadAppointmentHistory(appointmentId).then(
      (entries) => {
        if (current) setLoaded({ version, entries })
      },
      (error: unknown) => {
        if (current) setLoaded({ version, error: error instanceof Error ? error.message : 'Could not load the history' })
      },
    )
    return () => {
      current = false
    }
  }, [appointmentId, hidden, version])

  const shown = loaded?.version === version ? loaded : null

  return (
    <section className="history" aria-label="Booking history">
      <div className="section-label">History</div>
      {hidden ? (
        <EmptyState text="Demo accounts do not see who changed a booking." />
      ) : !shown ? (
        <SkeletonRows count={2} />
      ) : 'error' in shown ? (
        <div className="form-error">{shown.error}</div>
      ) : shown.entries.length === 0 ? (
        <EmptyState text="No changes recorded." />
      ) : (
        <ol className="history-list">
          {shown.entries.map((entry, index) => {
            const time = new Date(entry.createdAt)
            return (
              <li key={`${entry.createdAt}-${index}`}>
                <span>
                  <strong>
                    {historyActionLabel(entry.action)} by {entry.actor}
                  </strong>
                  <small>
                    {formatLongDate(time)}, {formatTime(time)}
                  </small>
                  <small>{entry.details}</small>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
