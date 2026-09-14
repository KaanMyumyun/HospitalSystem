import { describe, expect, it } from 'vitest'
import type { AppointmentDto, ScheduleDto } from '../api'
import { buildWeekSlots, weekDays } from './schedule'

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

  it('marks a cancelled appointment slot as cancelled rather than booked', () => {
    const farFutureWeekOffset = 520
    const days = weekDays(farFutureWeekOffset)
    const targetDay = days[0]!

    const schedule: ScheduleDto = {
      scheduleId: 1,
      doctorId: 42,
      startTime: '2026-01-01T09:00:00Z',
      endTime: '2026-01-01T10:00:00Z',
      slotDurationMin: 60,
    }

    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const appointments: AppointmentDto[] = [
      {
        appointmentId: 2,
        doctorId: 42,
        doctorName: 'Dr Test',
        patientId: 2,
        patientName: 'Patient Test',
        patientPhoneNumber: '5550100',
        appointmentTime: appointmentTime.toISOString(),
        status: 'Cancelled',
      },
    ]

    const grid = buildWeekSlots(schedule, 42, appointments, farFutureWeekOffset)

    expect(grid[0]![0]!.status).toBe('cancelled')
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
