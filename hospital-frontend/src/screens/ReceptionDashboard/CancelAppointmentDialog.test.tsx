import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActionOutcome } from '../../types'
import { appointment, renderInWorkspace } from '../../test/render'
import { CancelAppointmentDialog } from './CancelAppointmentDialog'

function open(onCancelAppointment: (appointmentId: number, reason: string) => Promise<ActionOutcome>) {
  const onClose = vi.fn()
  renderInWorkspace(
    <CancelAppointmentDialog appointment={appointment()} onCancelAppointment={onCancelAppointment} onClose={onClose} />,
  )
  return { onClose }
}

const confirmButton = () => screen.getByRole('button', { name: 'Confirm Cancellation' })

describe('CancelAppointmentDialog', () => {
  it('needs a reason that is more than spaces', async () => {
    open(vi.fn())

    expect(screen.getByText('Grace Hopper')).toBeTruthy()
    expect(confirmButton()).toHaveProperty('disabled', true)
    await userEvent.type(screen.getByLabelText('Cancellation Reason'), '   ')
    expect(confirmButton()).toHaveProperty('disabled', true)
    await userEvent.type(screen.getByLabelText('Cancellation Reason'), 'Patient called')
    expect(confirmButton()).toHaveProperty('disabled', false)
  })

  it('cancels with the reason and then closes', async () => {
    const onCancelAppointment = vi.fn(async () => ({ ok: true }) as const)
    const { onClose } = open(onCancelAppointment)

    await userEvent.type(screen.getByLabelText('Cancellation Reason'), 'Patient called')
    await userEvent.click(confirmButton())

    expect(onCancelAppointment).toHaveBeenCalledWith(42, 'Patient called')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows what the API refused and stays open until the reason changes', async () => {
    const { onClose } = open(async () => ({ ok: false, error: 'This appointment has already started' }))

    await userEvent.type(screen.getByLabelText('Cancellation Reason'), 'Patient called')
    await userEvent.click(confirmButton())
    expect(screen.getByText('This appointment has already started')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Cancellation Reason'), '.')
    expect(screen.queryByText('This appointment has already started')).toBeNull()
  })

  it('keeps the appointment when the desk changes its mind', async () => {
    const onCancelAppointment = vi.fn()
    const { onClose } = open(onCancelAppointment)

    await userEvent.click(screen.getByRole('button', { name: 'Keep Appointment' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onCancelAppointment).not.toHaveBeenCalled()
  })
})
