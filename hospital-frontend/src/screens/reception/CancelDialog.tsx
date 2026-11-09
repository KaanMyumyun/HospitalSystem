import { useState } from 'react'
import { cancelAppointment } from '../../api/client'
import type { AppointmentDto } from '../../api/client'
import { useWorkspace } from '../../app/workspaceContext'
import { ReasonPicker } from '../../components/ReasonPicker'
import { mediumDate, timeOf } from '../../lib/dates'
import { personName } from '../../lib/names'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Field, FormError } from '../../ui/Field'

const reasons = ['Patient asked to cancel', 'Patient is unwell', 'Doctor unavailable', 'Booked by mistake']

export function CancelDialog({ appointment, onClose }: { appointment: AppointmentDto; onClose: () => void }) {
  const { run, busy, readOnly } = useWorkspace()
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const time = new Date(appointment.appointmentTime)

  const submit = async () => {
    setTried(true)
    if (!reason.trim()) return
    const outcome = await run(
      () => cancelAppointment(appointment.appointmentId, reason.trim()),
      `Cancelled ${appointment.patientName}'s booking`,
      { quiet: true },
    )
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <Dialog
      description={`${mediumDate(time)} at ${timeOf(time)} with ${personName(appointment.doctorName)}. The slot opens up for someone else.`}
      dismissOnBackdrop={false}
      eyebrow="Cancel booking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep the booking
          </Button>
          <Button busy={busy} locked={readOnly} type="submit" variant="danger-solid">
            Cancel booking
          </Button>
        </>
      }
      size="md"
      title={appointment.patientName}
      tone="danger"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field error={tried && !reason.trim() ? 'Say why, so the record makes sense later' : null} label="Reason">
        {(control) => (
          <ReasonPicker
            control={control}
            placeholder="Or write your own"
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
