import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AppointmentDto } from '../../api'
import { readOnlyTitle } from '../../lib/readOnly'
import { appointment, doctor, renderInWorkspace } from '../../test/render'
import type { Slot } from '../../types'
import { AppointmentPanel } from './AppointmentPanel'

// The history loads from the API; here it only shows whether it is there.
vi.mock('../../components/AppointmentHistory', () => ({
  AppointmentHistory: ({ hidden }: { hidden: boolean }) => (hidden ? null : <p>Booking history</p>),
}))

const openSlot: Slot = { day: new Date('2099-03-02T00:00:00Z'), time: '10:00', status: 'available' }
const started = appointment({ appointmentTime: '2020-01-06T09:00:00Z' })

function show(
  shown: AppointmentDto | null,
  { isReadOnly = false, moving = null as AppointmentDto | null, nextAvailableSlot = openSlot as Slot | null } = {},
) {
  const handlers = { onBookSlot: vi.fn(), onCancel: vi.fn(), onMark: vi.fn(), onStartMove: vi.fn() }
  renderInWorkspace(
    <AppointmentPanel
      appointment={shown}
      doctor={doctor()}
      moving={moving}
      nextAvailableSlot={nextAvailableSlot}
      {...handlers}
    />,
    { isReadOnly },
  )
  return handlers
}

const button = (name: string) => screen.getByRole('button', { name })

describe('AppointmentPanel', () => {
  it('without a booking, offers only the next open slot', async () => {
    const { onBookSlot } = show(null)

    expect(screen.getByText('Choose a booked slot to view appointment details.')).toBeTruthy()
    expect(button('Move Appointment')).toHaveProperty('disabled', true)
    expect(button('Cancel Appointment')).toHaveProperty('disabled', true)
    await userEvent.click(button('Book Next Available'))
    expect(onBookSlot).toHaveBeenCalledWith(openSlot)
  })

  it('has nothing to book when the week has no open slot', () => {
    show(null, { nextAvailableSlot: null })

    expect(button('Book Next Available')).toHaveProperty('disabled', true)
  })

  it('shows an upcoming booking, which can be moved or cancelled but not marked yet', async () => {
    const shown = appointment()
    const { onCancel, onStartMove } = show(shown)

    expect(screen.getByText('Grace Hopper')).toBeTruthy()
    expect(screen.getByText('0888123456')).toBeTruthy()
    expect(screen.getByText('Booking history')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark completed' })).toBeNull()
    await userEvent.click(button('Move Appointment'))
    await userEvent.click(button('Cancel Appointment'))
    expect(onStartMove).toHaveBeenCalledWith(shown)
    expect(onCancel).toHaveBeenCalledWith(shown)
  })

  it('lets a booking that has started be marked, but no longer moved or cancelled', async () => {
    const { onMark } = show(started)

    expect(button('Move Appointment')).toHaveProperty('disabled', true)
    expect(button('Cancel Appointment')).toHaveProperty('disabled', true)
    await userEvent.click(button('Mark no-show'))
    expect(onMark).toHaveBeenCalledWith(42, 'NoShow')
  })

  it('offers only the other mark once one is set', () => {
    show(appointment({ appointmentTime: started.appointmentTime, status: 'Completed' }))

    expect(button('Mark completed')).toHaveProperty('disabled', true)
    expect(button('Mark no-show')).toHaveProperty('disabled', false)
  })

  it('does not book the next slot while a booking is being moved', () => {
    const shown = appointment()
    show(shown, { moving: shown })

    expect(button('Book Next Available')).toHaveProperty('disabled', true)
  })

  it('gives a demo account no actions and no history', () => {
    show(started, { isReadOnly: true })

    for (const name of ['Book Next Available', 'Move Appointment', 'Cancel Appointment', 'Mark completed', 'Mark no-show']) {
      expect(button(name)).toHaveProperty('disabled', true)
      expect(button(name).title).toBe(readOnlyTitle)
    }
    expect(screen.queryByText('Booking history')).toBeNull()
  })
})
