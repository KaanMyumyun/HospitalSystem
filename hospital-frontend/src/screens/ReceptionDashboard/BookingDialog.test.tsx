import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PossiblePatientMatchError } from '../../api'
import type { CreateAppointmentInput } from '../../api'
import { readOnlyTitle } from '../../lib/readOnly'
import { doctor, renderInWorkspace } from '../../test/render'
import type { ActionOutcome, Slot } from '../../types'
import { BookingDialog } from './BookingDialog'

const slot: Slot = { day: new Date('2099-03-02T00:00:00Z'), time: '09:00', status: 'available' }
const match = { patientId: 31, name: 'Grace Hopper', dateOfBirth: '1990-05-20', phoneNumber: '0888123456' }

function open(onCreateAppointment: (input: CreateAppointmentInput) => Promise<ActionOutcome>, isReadOnly = false) {
  const onClose = vi.fn()
  renderInWorkspace(
    <BookingDialog doctor={doctor()} slot={slot} onClose={onClose} onCreateAppointment={onCreateAppointment} />,
    { isReadOnly },
  )
  return { onClose }
}

async function fillIn(name: string, phone: string, dateOfBirth: string) {
  await userEvent.type(screen.getByLabelText('Patient Name'), name)
  await userEvent.type(screen.getByLabelText('Phone Number'), phone)
  fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: dateOfBirth } })
}

const confirmButton = () => screen.getByRole('button', { name: 'Confirm Booking' })

describe('BookingDialog', () => {
  it('names the doctor and slot, and keeps Confirm Booking off until every field has a value', async () => {
    open(vi.fn())

    expect(screen.getByText('Dr. Ada Lovelace')).toBeTruthy()
    expect(screen.getByText(/at 09:00$/)).toBeTruthy()
    expect(confirmButton()).toHaveProperty('disabled', true)
    await userEvent.type(screen.getByLabelText('Patient Name'), 'Grace Hopper')
    await userEvent.type(screen.getByLabelText('Phone Number'), '0888 123 456')
    expect(confirmButton()).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1990-05-20' } })
    expect(confirmButton()).toHaveProperty('disabled', false)
  })

  it('books the trimmed details at the slot, in clinic time, and then closes', async () => {
    const onCreateAppointment = vi.fn(async () => ({ ok: true }) as const)
    const { onClose } = open(onCreateAppointment)

    await fillIn('  Grace Hopper ', '0888 123 456', '1990-05-20')
    await userEvent.click(confirmButton())

    expect(onCreateAppointment).toHaveBeenCalledWith({
      doctorId: 7,
      patientName: 'Grace Hopper',
      phoneNumber: '0888 123 456',
      dateOfBirth: '1990-05-20',
      appointmentTime: '2099-03-02T09:00:00+00:00',
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('checks the phone number before it asks the API', async () => {
    const onCreateAppointment = vi.fn()
    open(onCreateAppointment)

    await fillIn('Grace Hopper', '123', '1990-05-20')
    await userEvent.click(confirmButton())

    expect(screen.getByText('Phone number must contain 7 to 15 digits and no letters')).toBeTruthy()
    expect(onCreateAppointment).not.toHaveBeenCalled()
  })

  it('shows what the API refused and keeps what was typed', async () => {
    const { onClose } = open(async () => ({ ok: false, error: 'This slot was just booked' }))

    await fillIn('Grace Hopper', '0888123456', '1990-05-20')
    await userEvent.click(confirmButton())

    expect(screen.getByText('This slot was just booked')).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Patient Name').value).toBe('Grace Hopper')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lists patients on file who partly match, then books for the one the desk picks', async () => {
    const onCreateAppointment = vi
      .fn<(input: CreateAppointmentInput) => Promise<ActionOutcome>>()
      .mockResolvedValueOnce({ ok: false, cause: new PossiblePatientMatchError('Possible match', [match]) })
      .mockResolvedValueOnce({ ok: true })
    const { onClose } = open(onCreateAppointment)

    await fillIn('Grace Hoper', '0888123456', '1990-05-20')
    await userEvent.click(confirmButton())
    const list = screen.getByRole('list', { name: 'Patients on file' })
    expect(list.textContent).toContain('Born 1990-05-20 · 0888123456')
    await userEvent.click(screen.getByRole('button', { name: 'Book for Grace Hopper' }))

    expect(onCreateAppointment).toHaveBeenLastCalledWith(expect.objectContaining({ patientId: 31 }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('can register a new patient instead, and an edit makes the matches go away', async () => {
    const onCreateAppointment = vi
      .fn<(input: CreateAppointmentInput) => Promise<ActionOutcome>>()
      .mockResolvedValue({ ok: false, cause: new PossiblePatientMatchError('Possible match', [match]) })
    open(onCreateAppointment)

    await fillIn('Grace Hoper', '0888123456', '1990-05-20')
    await userEvent.click(confirmButton())
    await userEvent.click(screen.getByRole('button', { name: 'Register as new patient' }))
    expect(onCreateAppointment).toHaveBeenLastCalledWith(expect.objectContaining({ createNewPatient: true }))

    await userEvent.type(screen.getByLabelText('Patient Name'), 'p')
    expect(screen.queryByRole('list', { name: 'Patients on file' })).toBeNull()
    expect(confirmButton()).toBeTruthy()
  })

  it('lets a demo account see the form but not book', async () => {
    open(vi.fn(), true)

    await fillIn('Grace Hopper', '0888123456', '1990-05-20')

    expect(confirmButton()).toHaveProperty('disabled', true)
    expect(confirmButton().title).toBe(readOnlyTitle)
  })
})
