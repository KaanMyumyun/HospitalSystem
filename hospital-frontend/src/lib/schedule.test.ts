import { describe, expect, it } from 'vitest'
import type { AppointmentDto, ScheduleDto } from '../api'
import { buildWeekSlots, canCancelAppointment, isInWeek, weekDays } from './schedule'

const oneHourSchedule: ScheduleDto = {
  scheduleId: 1,
  doctorId: 42,
  startTime: '2026-01-01T09:00:00Z',
  endTime: '2026-01-01T10:00:00Z',
  slotDurationMin: 60,
}

function appointmentAt(time: Date, overrides: Partial<AppointmentDto> = {}): AppointmentDto {
  return {
    appointmentId: 1,
    doctorId: 42,
    doctorName: 'Dr Test',
    patientId: 1,
    patientName: 'Patient Test',
    patientPhoneNumber: '5550100',
    appointmentTime: time.toISOString(),
    status: 'Scheduled',
    ...overrides,
  }
}

describe('weekDays', () => {
  it('returns five consecutive days starting on Monday', () => {
    const days = weekDays(0)

    expect(days).toHaveLength(5)
    expect(days[0]?.getDay()).toBe(1)

    for (let i = 1; i < days.length; i++) {
      const diffMs = days[i]!.getTime() - days[i - 1]!.getTime()
      expect(diffMs).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('shifts the whole week by weekOffset weeks', () => {
    const thisWeek = weekDays(0)
    const nextWeek = weekDays(1)

    expect(nextWeek[0]!.getTime() - thisWeek[0]!.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

describe('buildWeekSlots', () => {
  it('returns an empty 5x5 grid when there is no schedule', () => {
    const grid = buildWeekSlots(undefined, undefined, [], 0)

    expect(grid).toHaveLength(5)
    grid.forEach((row) => expect(row).toHaveLength(5))
    expect(grid[0]!.every((slot) => slot.status === 'empty' && slot.time === 'No schedule')).toBe(true)
    expect(grid[1]!.every((slot) => slot.status === 'empty' && slot.time === '')).toBe(true)
  })

  it('marks a matching appointment as booked and leaves other future slots available', () => {
    const farFutureWeekOffset = 520 // ~10 years ahead, safely clear of "now"
    const days = weekDays(farFutureWeekOffset)
    const targetDay = days[0]!

    const schedule: ScheduleDto = {
      scheduleId: 1,
      doctorId: 42,
      startTime: '2026-01-01T09:00:00Z',
      endTime: '2026-01-01T11:00:00Z',
      slotDurationMin: 60,
    }

    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const appointments: AppointmentDto[] = [
      {
        appointmentId: 1,
        doctorId: 42,
        doctorName: 'Dr Test',
        patientId: 1,
        patientName: 'Patient Test',
        patientPhoneNumber: '5550100',
        appointmentTime: appointmentTime.toISOString(),
        status: 'Scheduled',
      },
    ]

    const grid = buildWeekSlots(schedule, 42, appointments, farFutureWeekOffset)

    expect(grid).toHaveLength(2) // 09:00 and 10:00 rows
    expect(grid[0]).toHaveLength(5)

    const bookedSlot = grid[0]![0]!
    expect(bookedSlot.status).toBe('booked')
    expect(bookedSlot.appointment?.appointmentId).toBe(1)

    const availableSlotSameRow = grid[0]![1]!
    expect(availableSlotSameRow.status).toBe('available')

    const availableSlotNextRow = grid[1]![0]!
    expect(availableSlotNextRow.status).toBe('available')
  })

  it('makes a future slot available again once its appointment is cancelled', () => {
    const farFutureWeekOffset = 520
    const targetDay = weekDays(farFutureWeekOffset)[0]!
    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const grid = buildWeekSlots(
      oneHourSchedule,
      42,
      [appointmentAt(appointmentTime, { appointmentId: 2, status: 'Cancelled' })],
      farFutureWeekOffset,
    )

    expect(grid[0]![0]!.status).toBe('available')
    expect(grid[0]![0]!.appointment).toBeUndefined()
  })

  it('shows the new booking in a slot that also holds a cancelled appointment', () => {
    const farFutureWeekOffset = 520
    const targetDay = weekDays(farFutureWeekOffset)[0]!
    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const grid = buildWeekSlots(
      oneHourSchedule,
      42,
      [
        appointmentAt(appointmentTime, { appointmentId: 2, status: 'Cancelled' }),
        appointmentAt(appointmentTime, { appointmentId: 3, status: 'Scheduled' }),
      ],
      farFutureWeekOffset,
    )

    expect(grid[0]![0]!.status).toBe('booked')
    expect(grid[0]![0]!.appointment?.appointmentId).toBe(3)
  })

  it('keeps showing a cancellation in a past slot', () => {
    const farPastWeekOffset = -520
    const targetDay = weekDays(farPastWeekOffset)[0]!
    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const grid = buildWeekSlots(
      oneHourSchedule,
      42,
      [appointmentAt(appointmentTime, { appointmentId: 2, status: 'Cancelled' })],
      farPastWeekOffset,
    )

    expect(grid[0]![0]!.status).toBe('cancelled')
    expect(grid[0]![0]!.appointment?.appointmentId).toBe(2)
  })

  it('marks slots in the past as past rather than available', () => {
    const farPastWeekOffset = -520 // ~10 years ago, safely before "now"

    const schedule: ScheduleDto = {
      scheduleId: 1,
      doctorId: 42,
      startTime: '2020-01-01T09:00:00Z',
      endTime: '2020-01-01T11:00:00Z',
      slotDurationMin: 60,
    }

    const grid = buildWeekSlots(schedule, 42, [], farPastWeekOffset)

    grid.forEach((row) => row.forEach((slot) => expect(slot.status).toBe('past')))
  })
})

describe('canCancelAppointment', () => {
  const now = new Date('2030-01-01T12:00:00Z').getTime()

  it('allows a scheduled appointment in the future', () => {
    expect(canCancelAppointment(appointmentAt(new Date('2030-01-02T09:00:00Z')), now)).toBe(true)
  })

  it('refuses a scheduled appointment in the past', () => {
    expect(canCancelAppointment(appointmentAt(new Date('2029-12-31T09:00:00Z')), now)).toBe(false)
  })

  it('refuses appointments that are not scheduled', () => {
    const future = new Date('2030-01-02T09:00:00Z')
    expect(canCancelAppointment(appointmentAt(future, { status: 'Cancelled' }), now)).toBe(false)
    expect(canCancelAppointment(appointmentAt(future, { status: 'Completed' }), now)).toBe(false)
  })
})

describe('isInWeek', () => {
  it('includes the whole Friday and excludes the following Saturday', () => {
    const days = weekDays(0)
    const friday = new Date(days[4]!)
    friday.setHours(23, 59, 0, 0)
    const saturday = new Date(days[4]!)
    saturday.setDate(saturday.getDate() + 1)

    expect(isInWeek(days[0]!, 0)).toBe(true)
    expect(isInWeek(friday, 0)).toBe(true)
    expect(isInWeek(saturday, 0)).toBe(false)
  })
})
