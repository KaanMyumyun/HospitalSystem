import { useState } from 'react'
import type { AppointmentDto } from '../../api'
import { GuardedButton, Modal } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { formatLongDate } from '../../lib/format'
import type { ActionOutcome } from '../../types'

// Cancelling a booking needs a reason, which the booking's history keeps.
export function CancelAppointmentDialog({
  appointment,
  onCancelAppointment,
  onClose,
}: {
  appointment: AppointmentDto
  onCancelAppointment: (appointmentId: number, reason: string) => Promise<ActionOutcome>
  onClose: () => void
}) {
  const { isReadOnly, loading } = useWorkspace()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const outcome = await onCancelAppointment(appointment.appointmentId, reason)
    if (!outcome.ok) {
      if (outcome.error) setError(outcome.error)
      return
    }
    onClose()
  }

  return (
    <Modal title="Cancel appointment" tone="danger" onClose={onClose}>
      <div className="summary-box danger">
        <strong>{appointment.patientName}</strong>
        <span>{formatLongDate(new Date(appointment.appointmentTime))}</span>
      </div>
      <div className="form-grid">
        <label>
          Cancellation Reason
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
          Keep Appointment
        </button>
        <GuardedButton
          className="secondary-button danger"
          readOnly={isReadOnly}
          disabled={!reason.trim() || loading}
          onClick={() => void submit()}
        >
          Confirm Cancellation
        </GuardedButton>
      </div>
    </Modal>
  )
}
