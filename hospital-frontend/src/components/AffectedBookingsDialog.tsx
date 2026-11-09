import { useState } from 'react'
import type { AffectedBookingsError } from '../api/client'
import { mediumDate, timeOf } from '../lib/dates'
import { personName } from '../lib/names'
import type { ActionOutcome } from '../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, FormError } from '../ui/Field'
import { ReasonPicker } from './ReasonPicker'

const reasons = ['Doctor unavailable', 'Schedule changed', 'Department closed']

export function AffectedBookingsDialog({
  affected,
  busy,
  onCancelBookings,
  onClose,
}: {
  affected: AffectedBookingsError
  busy: boolean
  onCancelBookings: (reason: string) => Promise<ActionOutcome>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const notListed = affected.count - affected.bookings.length
  const count = affected.count === 1 ? 'the booking' : `${affected.count} bookings`

  const submit = async () => {
    if (!reason.trim()) {
      setError('Give a reason. Patients and the desk see it on each cancelled booking.')
      return
    }
    const outcome = await onCancelBookings(reason.trim())
    if (!outcome.ok && outcome.error) setError(outcome.error)
  }

  return (
    <Dialog
      description={affected.message}
      dismissOnBackdrop={false}
      eyebrow={`${affected.count} future ${affected.count === 1 ? 'booking' : 'bookings'} affected`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep everything as it is
          </Button>
          <Button busy={busy} type="submit" variant="danger-solid">
            Cancel {count} and save
          </Button>
        </>
      }
      size="md"
      title="This change strands bookings"
      tone="danger"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <ul aria-label="Affected bookings" className="affected-list">
        {affected.bookings.map((booking) => {
          const time = new Date(booking.appointmentTime)
          return (
            <li key={booking.appointmentId}>
              <span className="affected-when">
                <span className="affected-date">{mediumDate(time)}</span>
                <span className="mono">{timeOf(time)}</span>
              </span>
              <span className="affected-doctor">{personName(booking.doctorName)}</span>
              <span className="affected-patient" title="Patient initials">
                {booking.patientInitials}
              </span>
            </li>
          )
        })}
      </ul>
      {notListed > 0 && <p className="field-hint">And {notListed} more after these.</p>}
      <Field error={null} label="Reason for cancelling them">
        {(control) => (
          <ReasonPicker
            control={control}
            placeholder="Shown on each cancelled booking"
            suggestions={reasons}
            value={reason}
            onChange={(value) => {
              setError(null)
              setReason(value)
            }}
          />
        )}
      </Field>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}
