import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { appointment, doctor, renderInWorkspace, schedule } from '../../test/render'
import { AppointmentDetails, WeekSummary } from './AppointmentPane'
import { CancelDialog } from './CancelDialog'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, loadAppointmentHistory: vi.fn(), cancelAppointment: vi.fn() }
})

beforeEach(() => {
  vi.mocked(api.loadAppointmentHistory).mockResolvedValue([])
  vi.mocked(api.cancelAppointment).mockReset()
  vi.mocked(api.cancelAppointment).mockResolvedValue({ isSuccess: true, error: null })
})

const now = Date.parse('2099-03-02T10:00:00Z')

function details(item = appointment(), extra: Partial<Parameters<typeof AppointmentDetails>[0]> = {}) {
  const handlers = { onMove: vi.fn(), onCancel: vi.fn(), onMark: vi.fn() }
  renderInWorkspace(<AppointmentDetails appointment={item} now={now} schedule={schedule()} {...handlers} {...extra} />)
  return handlers
}

describe('AppointmentDetails', () => {
  it('offers moving and cancelling before the visit starts', async () => {
    const handlers = details(appointment({ appointmentTime: '2099-03-02T11:00:00Z' }))
    expect(screen.getByText('11:00 – 11:30')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(handlers.onMove).toHaveBeenCalled()
    expect(screen.queryByRole('radiogroup', { name: 'Mark the visit' })).toBeNull()
  })

  it('asks how a visit went once it has started', async () => {
    const handlers = details(appointment({ appointmentTime: '2099-03-02T09:00:00Z' }))
    expect(screen.queryByRole('button', { name: 'Move' })).toBeNull()
    expect(screen.getByText('How did the visit go?')).toBeTruthy()
    await userEvent.click(screen.getByRole('radio', { name: 'No-show' }))
    expect(handlers.onMark).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 42 }), 'NoShow')
  })

  it('says a move is under way instead of offering it again', () => {
    details(appointment({ appointmentTime: '2099-03-02T11:00:00Z' }), { moving: true, onStopMoving: vi.fn() })
    expect(screen.getByText(/Pick a new slot in the calendar/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull()
  })

  it('keeps changes locked for demo accounts', () => {
    renderInWorkspace(
      <AppointmentDetails
        appointment={appointment({ appointmentTime: '2099-03-02T11:00:00Z' })}
        now={now}
        schedule={schedule()}
        onCancel={vi.fn()}
        onMark={vi.fn()}
        onMove={vi.fn()}
      />,
      { readOnly: true },
    )
    expect((screen.getByRole('button', { name: 'Move' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText("Demo accounts don't see who changed a booking.")).toBeTruthy()
  })
})

describe('WeekSummary', () => {
  const counts = { booked: 3, available: 0, cancelled: 1, capacity: 12 }

  it('shares booked slots out of all working slots', () => {
    renderInWorkspace(
      <WeekSummary counts={counts} doctor={doctor()} hasSchedule nextOpen={undefined} weekOffset={0} onBook={vi.fn()} onWeek={vi.fn()} />,
    )
    expect(screen.getByText('25%')).toBeTruthy()
  })

  it('points a past week forward', async () => {
    const onWeek = vi.fn()
    renderInWorkspace(
      <WeekSummary counts={counts} doctor={doctor()} hasSchedule nextOpen={undefined} weekOffset={-2} onBook={vi.fn()} onWeek={onWeek} />,
    )
    expect(screen.getByText('This week is over, so nothing here can be booked.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Go to this week' }))
    expect(onWeek).toHaveBeenCalledWith(0)
  })
})

describe('CancelDialog', () => {
  it('needs a reason, and fills one in from the common ones', async () => {
    const onClose = vi.fn()
    renderInWorkspace(<CancelDialog appointment={appointment()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText('Say why, so the record makes sense later')).toBeTruthy()
    expect(api.cancelAppointment).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Doctor unavailable' }))
    expect((screen.getByLabelText('Reason') as HTMLTextAreaElement).value).toBe('Doctor unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel booking' }))
    expect(api.cancelAppointment).toHaveBeenCalledWith(42, 'Doctor unavailable')
    expect(onClose).toHaveBeenCalled()
  })
})
