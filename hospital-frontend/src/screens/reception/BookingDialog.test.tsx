import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { doctor, renderInWorkspace } from '../../test/render'
import type { Slot } from '../../types'
import { BookingDialog } from './BookingDialog'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, createAppointment: vi.fn(), loadPatients: vi.fn() }
})

const slot: Slot = { day: new Date('2099-03-02T00:00:00Z'), time: '09:00', status: 'available' }
const grace = { patientId: 9, name: 'Grace Hopper', dateOfBirth: '1906-12-09', phoneNumber: '0888123456' }

function renderDialog() {
  const onBooked = vi.fn()
  const onClose = vi.fn()
  const result = renderInWorkspace(
    <BookingDialog doctor={doctor()} slot={slot} slotMinutes={30} onBooked={onBooked} onClose={onClose} />,
  )
  return { ...result, onBooked, onClose }
}

beforeEach(() => {
  vi.mocked(api.createAppointment).mockReset()
  vi.mocked(api.loadPatients).mockReset()
  vi.mocked(api.loadPatients).mockResolvedValue({ items: [], hasNextPage: false, page: 1, pageSize: 5 })
})

describe('BookingDialog', () => {
  it('names the slot and doctor', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Mon 2 Mar, 09:00' })).toBeTruthy()
    expect(screen.getByText(/Ada Lovelace · Cardiology · until 09:30/)).toBeTruthy()
  })

  it('says what is missing instead of booking', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(screen.getByText('Enter the patient’s name')).toBeTruthy()
    expect(screen.getByText('Enter a phone number')).toBeTruthy()
    expect(screen.getByText('Enter the date of birth')).toBeTruthy()
    expect(api.createAppointment).not.toHaveBeenCalled()
  })

  it('books for a patient already on file, by id', async () => {
    vi.mocked(api.loadPatients).mockResolvedValue({ items: [grace], hasNextPage: false, page: 1, pageSize: 5 })
    vi.mocked(api.createAppointment).mockResolvedValue({ isSuccess: true, error: null, isConflict: false, possibleMatches: null })
    const { onBooked } = renderDialog()

    await userEvent.type(screen.getByLabelText('Patient name'), 'Grace')
    await screen.findByText('Already on file?')
    await userEvent.click(screen.getByRole('button', { name: 'Use' }))
    expect(screen.getByText('On file')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))

    await waitFor(() => expect(onBooked).toHaveBeenCalled())
    expect(api.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorId: 7,
        patientId: 9,
        patientName: 'Grace Hopper',
        phoneNumber: '0888123456',
        dateOfBirth: '1906-12-09',
        appointmentTime: '2099-03-02T09:00:00+00:00',
      }),
    )
  })

  it('asks which patient is meant when the details partly match, and can register someone new', async () => {
    vi.mocked(api.createAppointment)
      .mockRejectedValueOnce(new api.PossiblePatientMatchError('Partly matches', [grace]))
      .mockResolvedValueOnce({ isSuccess: true, error: null, isConflict: false, possibleMatches: null })
    const { onBooked } = renderDialog()

    await userEvent.type(screen.getByLabelText('Patient name'), 'Grace Smith')
    await userEvent.type(screen.getByLabelText('Phone'), '0888 123 456')
    await userEvent.type(screen.getByLabelText('Date of birth'), '1950-01-01')
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))

    expect(await screen.findByText(/partly match a patient already on file/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Book for Grace' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Register as a new patient' }))

    await waitFor(() => expect(onBooked).toHaveBeenCalled())
    expect(api.createAppointment).toHaveBeenLastCalledWith(expect.objectContaining({ createNewPatient: true, patientName: 'Grace Smith' }))
  })

  it('shows what the server refused', async () => {
    vi.mocked(api.createAppointment).mockRejectedValue(new Error('Doctor already booked for that time slot'))
    renderDialog()
    await userEvent.type(screen.getByLabelText('Patient name'), 'Alan Turing')
    await userEvent.type(screen.getByLabelText('Phone'), '0888 222 333')
    await userEvent.type(screen.getByLabelText('Date of birth'), '1912-06-23')
    await userEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Doctor already booked for that time slot')
  })
})
