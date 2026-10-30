import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AppointmentDto } from '../../api'
import { appointment, department, doctor, renderInWorkspace } from '../../test/render'
import type { Slot } from '../../types'
import { WeekCalendar } from './WeekCalendar'

const monday = new Date('2099-03-02T00:00:00Z')
const booked: Slot = { day: monday, time: '09:00', status: 'booked', appointment: appointment() }
const open: Slot = { day: monday, time: '09:30', status: 'available' }
const past: Slot = { day: monday, time: '10:00', status: 'past' }
const lunch: Slot = { day: monday, time: '10:30', status: 'break' }

function show(slots: Slot[][], moving: AppointmentDto | null = null) {
  const handlers = { onChooseSlot: vi.fn(), onStopMoving: vi.fn(), onWeekOffsetChange: vi.fn() }
  renderInWorkspace(
    <WeekCalendar
      counts={{ booked: 3, available: 12, cancelled: 1 }}
      days={[monday]}
      doctor={doctor()}
      moving={moving}
      schedule={{
        scheduleId: 1,
        doctorId: 7,
        startTime: '2000-01-01T09:00:00Z',
        endTime: '2000-01-01T17:00:00Z',
        slotDurationMin: 30,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        breakStartMinute: null,
        breakEndMinute: null,
        timeOff: [],
      }}
      slots={slots}
      {...handlers}
    />,
    { departments: [department()] },
  )
  return handlers
}

const grid = () => within(screen.getByRole('group', { name: 'Weekly appointment schedule' }))

describe('WeekCalendar', () => {
  it("heads the week with the doctor, their schedule and the week's counts", () => {
    show([[open]])

    expect(screen.getByRole('heading', { name: 'Dr. Ada Lovelace' })).toBeTruthy()
    expect(screen.getByText(/^Cardiology · 30 min slots/)).toBeTruthy()
    expect(screen.getByText('Booked').nextElementSibling?.textContent).toBe('3')
    expect(screen.getByText('Open').nextElementSibling?.textContent).toBe('12')
    expect(screen.getByText('Cancelled').nextElementSibling?.textContent).toBe('1')
  })

  it("names each slot's day and time, and shows a booking by the patient's initials only", async () => {
    const { onChooseSlot } = show([[booked, open]])

    const bookedSlot = grid().getByRole('button', { name: /at 09:00: GH$/ })
    expect(bookedSlot.textContent).not.toContain('Grace')
    await userEvent.click(bookedSlot)
    await userEvent.click(grid().getByRole('button', { name: /at 09:30: Available$/ }))
    expect(onChooseSlot.mock.calls).toEqual([[booked], [open]])
  })

  it('says how a marked booking went', () => {
    show([[{ ...booked, appointment: appointment({ status: 'Completed' }) }]])

    expect(grid().getByRole('button', { name: /at 09:00: GH · done$/ })).toBeTruthy()
  })

  it('does not let past slots or breaks be chosen', () => {
    show([[past, lunch]])

    expect(grid().getByRole('button', { name: /at 10:00: Past$/ })).toHaveProperty('disabled', true)
    expect(grid().getByRole('button', { name: /at 10:30: Break$/ })).toHaveProperty('disabled', true)
  })

  it('while a booking moves, says where it can go and lets the desk stop', async () => {
    const { onStopMoving } = show([[booked, open]], appointment())

    expect(screen.getByRole('status').textContent).toContain('Moving Grace Hopper')
    expect(grid().getByRole('button', { name: /at 09:30: Move here$/ })).toBeTruthy()
    expect(grid().getByRole('button', { name: /at 09:00: GH$/ })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Stop moving' }))
    expect(onStopMoving).toHaveBeenCalledOnce()
  })

  it('turns the week back, to the current one and forward', async () => {
    const { onWeekOffsetChange } = show([[open]])

    await userEvent.click(screen.getByRole('button', { name: 'Previous Week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Current Week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next Week' }))

    const [back, current, forward] = onWeekOffsetChange.mock.calls.map(([change]) => change)
    expect(back(0)).toBe(-1)
    expect(current).toBe(0)
    expect(forward(0)).toBe(1)
  })
})
