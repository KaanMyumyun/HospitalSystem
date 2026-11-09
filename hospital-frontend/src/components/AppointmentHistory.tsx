import { loadAppointmentHistory } from '../api/client'
import type { AppointmentDto } from '../api/client'
import { useResource } from '../app/useResource'
import { mediumDate, timeOf } from '../lib/dates'
import { historyActionLabel } from '../lib/format'
import { Skeleton } from '../ui/bits'

export function AppointmentHistory({ appointment, hidden }: { appointment: AppointmentDto; hidden: boolean }) {
  const key = hidden
    ? null
    : `history:${appointment.appointmentId}:${appointment.status}:${appointment.appointmentTime}:${appointment.doctorId}`
  const { data, error } = useResource(key, (signal) => loadAppointmentHistory(appointment.appointmentId, signal))

  return (
    <section aria-label="Booking history" className="history">
      <h3 className="history-title">History</h3>
      {hidden ? (
        <p className="history-note">Demo accounts don't see who changed a booking.</p>
      ) : error ? (
        <p className="history-note">{error}</p>
      ) : !data ? (
        <Skeleton lines={2} />
      ) : data.length === 0 ? (
        <p className="history-note">No changes recorded.</p>
      ) : (
        <ol className="history-list">
          {data.map((entry, index) => {
            const time = new Date(entry.createdAt)
            return (
              <li key={`${entry.createdAt}-${index}`}>
                <span className="history-dot" aria-hidden="true" />
                <div>
                  <p className="history-what">
                    <strong>{historyActionLabel(entry.action)}</strong> by <span className="history-actor">{entry.actor}</span>
                  </p>
                  <p className="history-when">
                    {mediumDate(time)} · <span className="mono">{timeOf(time)}</span>
                  </p>
                  {entry.details && <p className="history-details">{entry.details}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
