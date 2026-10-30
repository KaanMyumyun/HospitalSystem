import { useState } from 'react'
import type { AffectedBookingsError } from '../api'
import { formatLongDate, formatTime } from '../lib/format'
import type { ActionOutcome } from '../types'
import { Modal } from './ui'

export function AffectedBookingsDialog({
  affected,
  loading,
  onCancelBookings,
  onClose,
}: {
  affected: AffectedBookingsError
  loading: boolean
  onCancelBookings: (reason: string) => Promise<ActionOutcome>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const notListed = affected.count - affected.bookings.length

  const confirm = async () => {
    const outcome = await onCancelBookings(reason.trim())
    if (!outcome.ok && outcome.error) setError(outcome.error)
  }

  return (
    <Modal title="Future bookings affected" tone="danger" onClose={onClose}>
      <p className="dialog-text">{affected.message}</p>
      <ul className="affected-list" aria-label="Affected bookings">
        {affected.bookings.map((booking) => {
          const time = new Date(booking.appointmentTime)
          return (
            <li key={booking.appointmentId}>
              <span className="doctor-avatar">{booking.patientInitials}</span>
              <span>
                <strong>
                  {formatLongDate(time)} at {formatTime(time)}
                </strong>
                <small>{booking.doctorName}</small>
              </span>
            </li>
          )
        })}
      </ul>
      {notListed > 0 && <p className="subtle">And {notListed} more after these.</p>}
      <div className="form-grid">
        <label>
          Reason for cancelling them
          <textarea
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setError(null)
              setReason(event.target.value)
            }}
          />
        </label>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Keep everything as it is
        </button>
        <button
          className="secondary-button danger"
          disabled={!reason.trim() || loading}
          type="button"
          onClick={() => void confirm()}
        >
          Cancel {affected.count === 1 ? 'the booking' : `${affected.count} bookings`} and save
        </button>
      </div>
    </Modal>
  )
}
