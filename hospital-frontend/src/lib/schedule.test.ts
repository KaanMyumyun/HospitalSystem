import { describe, expect, it } from 'vitest'
import type { AppointmentDto, DoctorDto, ScheduleDto } from '../api'
import { clinicDate } from './clinicTime'
import {
  buildWeekSlots,
  canMarkAppointment,
  dateAtTime,
  dayStart,
  defaultDoctor,
  getNextAvailableSlot,
  isAway,
  isInWeek,
  isUpcoming,
  shownDays,
  weekDays,
  weekRange,
} from './schedule'

const oneHourSchedule: ScheduleDto = {
  scheduleId: 1,
  doctorId: 42,
  startTime: '2026-01-01T09:00:00Z',
  endTime: '2026-01-01T10:00:00Z',
  slotDurationMin: 60,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breakStartMinute: null,
  breakEndMinute: null,
  timeOff: [],
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
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      breakStartMinute: null,
      breakEndMinute: null,
      timeOff: [],
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

  it("ignores another doctor's appointment at the same time", () => {
    const farFutureWeekOffset = 520
    const targetDay = weekDays(farFutureWeekOffset)[0]!
    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 0, 0)

    const grid = buildWeekSlots(
      oneHourSchedule,
      42,
      [appointmentAt(appointmentTime, { appointmentId: 4, doctorId: 7 })],
      farFutureWeekOffset,
    )

    expect(grid[0]![0]!.status).toBe('available')
  })

  it('puts an appointment in the slot of the minute it starts in', () => {
    const farFutureWeekOffset = 520
    const targetDay = weekDays(farFutureWeekOffset)[1]!
    const appointmentTime = new Date(targetDay)
    appointmentTime.setHours(9, 0, 30, 0)

    const grid = buildWeekSlots(oneHourSchedule, 42, [appointmentAt(appointmentTime, { appointmentId: 5 })], farFutureWeekOffset)

    expect(grid[0]![1]!.status).toBe('booked')
    expect(grid[0]![1]!.appointment?.appointmentId).toBe(5)
    expect(grid[0]![0]!.status).toBe('available')
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

  it('shows every slot as loading until the week has loaded', () => {
    const grid = buildWeekSlots(oneHourSchedule, 42, null, 520)

    expect(grid).toHaveLength(1)
    expect(grid[0]!.every((slot) => slot.status === 'loading' && slot.time === '09:00')).toBe(true)
  })

  it('marks slots in the past as past rather than available', () => {
    const farPastWeekOffset = -520 // ~10 years ago, safely before "now"

    const schedule: ScheduleDto = {
      scheduleId: 1,
      doctorId: 42,
      startTime: '2020-01-01T09:00:00Z',
      endTime: '2020-01-01T11:00:00Z',
      slotDurationMin: 60,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      breakStartMinute: null,
      breakEndMinute: null,
      timeOff: [],
    }

    const grid = buildWeekSlots(schedule, 42, [], farPastWeekOffset)

    grid.forEach((row) => row.forEach((slot) => expect(slot.status).toBe('past')))
  })
})

describe('breaks and time off', () => {
  const morning: ScheduleDto = {
    ...oneHourSchedule,
    endTime: '2026-01-01T12:00:00Z',
    breakStartMinute: 10 * 60,
    breakEndMinute: 11 * 60,
  }

  it('marks the slots in the break, and only those', () => {
    const grid = buildWeekSlots(morning, 42, [], 520)

    expect(grid.map((row) => row[0]!.status)).toEqual(['available', 'break', 'available'])
  })

  it('marks every slot the break overlaps, even part of', () => {
    const grid = buildWeekSlots({ ...morning, slotDurationMin: 30, breakStartMinute: 10 * 60 + 15, breakEndMinute: 10 * 60 + 45 }, 42, [], 520)

    expect(grid.map((row) => `${row[0]!.time} ${row[0]!.status}`)).toEqual([
      '09:00 available',
      '09:30 available',
      '10:00 break',
      '10:30 break',
      '11:00 available',
      '11:30 available',
    ])
  })

  it('marks the days of time off as away, and still shows their bookings', () => {
    const [wednesday, thursday] = weekDays(520, ['Wednesday', 'Thursday'])
    const away = { ...morning, timeOff: [{ timeOffId: 1, firstDay: clinicDate(wednesday!), lastDay: clinicDate(thursday!), reason: null }] }
    const booked = appointmentAt(dateAtTime(thursday!, '09:00'))

    const grid = buildWeekSlots(away, 42, [booked], 520)
    const column = (day: number) => grid.map((row) => row.find((slot) => slot.day.getDay() === day)!.status)

    expect(column(2)).toEqual(['available', 'break', 'available'])
    expect(column(3)).toEqual(['away', 'away', 'away'])
    expect(column(4)).toEqual(['booked', 'away', 'away'])
  })

  it('offers the next open slot, not one in the break or time off', () => {
    const [monday] = weekDays(520, ['Monday'])
    const away = { ...morning, timeOff: [{ timeOffId: 1, firstDay: clinicDate(monday!), lastDay: clinicDate(monday!), reason: null }] }
    const grid = buildWeekSlots(away, 42, [appointmentAt(dateAtTime(weekDays(520)[1]!, '09:00'))], 520)

    expect(getNextAvailableSlot(grid)).toMatchObject({ time: '11:00', status: 'available' })
    expect(getNextAvailableSlot(grid)!.day.getDay()).toBe(2)
  })

  it('reads a schedule from an API that sends no time off', () => {
    const { timeOff: _, ...older } = morning
    expect(isAway(older as ScheduleDto, '2030-01-01')).toBe(false)
  })
})

describe('isUpcoming', () => {
  const now = new Date('2030-01-01T12:00:00Z').getTime()

  it('allows a scheduled appointment in the future', () => {
    expect(isUpcoming(appointmentAt(new Date('2030-01-02T09:00:00Z')), now)).toBe(true)
  })

  it('refuses a scheduled appointment in the past', () => {
    expect(isUpcoming(appointmentAt(new Date('2029-12-31T09:00:00Z')), now)).toBe(false)
  })

  it('refuses appointments that are not scheduled', () => {
    const future = new Date('2030-01-02T09:00:00Z')
    expect(isUpcoming(appointmentAt(future, { status: 'Cancelled' }), now)).toBe(false)
    expect(isUpcoming(appointmentAt(future, { status: 'Completed' }), now)).toBe(false)
  })
})

describe('isInWeek', () => {
  it('includes the whole Sunday and excludes the following Monday', () => {
    const days = weekDays(0, ['Monday', 'Sunday'])
    const sunday = new Date(days[1]!)
    sunday.setHours(23, 59, 0, 0)
    const nextMonday = new Date(days[1]!)
    nextMonday.setDate(nextMonday.getDate() + 1)

    expect(isInWeek(days[0]!, 0)).toBe(true)
    expect(isInWeek(sunday, 0)).toBe(true)
    expect(isInWeek(nextMonday, 0)).toBe(false)
  })
})

describe('weekRange', () => {
  it('runs from Monday 00:00 to the next Monday 00:00, so weekend bookings load', () => {
    const [monday] = weekDays(3, ['Monday'])
    const { from, to } = weekRange(3)

    expect(from.getTime()).toBe(monday!.getTime())
    expect(from.getDay()).toBe(1)
    expect(to.getDay()).toBe(1)
    expect(to.getHours()).toBe(0)
    expect(Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))).toBe(7)
  })
})

describe('shownDays', () => {
  const weekendSchedule: ScheduleDto = { ...oneHourSchedule, workingDays: ['Saturday', 'Monday'] }

  it('shows the working days, Monday first', () => {
    expect(shownDays(weekendSchedule, [], 0)).toEqual(['Monday', 'Saturday'])
  })

  it('shows Monday to Friday for a doctor without a schedule', () => {
    expect(shownDays(undefined, [], 0)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  })

  it('also shows another day of the week when it holds a booking', () => {
    const [wednesday] = weekDays(520, ['Wednesday'])
    wednesday!.setHours(9, 0, 0, 0)

    expect(shownDays(weekendSchedule, [appointmentAt(wednesday!)], 520)).toEqual(['Monday', 'Wednesday', 'Saturday'])
  })

  it('marks the slots of a day the doctor does not work as off', () => {
    const [wednesday] = weekDays(520, ['Wednesday'])
    wednesday!.setHours(10, 0, 0, 0)

    const grid = buildWeekSlots({ ...weekendSchedule, endTime: '2026-01-01T11:00:00Z' }, 42, [appointmentAt(wednesday!)], 520)
    const wednesdaySlots = grid.map((row) => row.find((slot) => slot.day.getDay() === 3)!)

    expect(wednesdaySlots.map((slot) => slot.status)).toEqual(['off', 'booked'])
    expect(grid[0]!.map((slot) => slot.status)).toEqual(['available', 'off', 'available'])
  })
})

describe('canMarkAppointment', () => {
  const now = new Date('2026-06-01T12:00:00Z').getTime()
  const started = new Date('2026-06-01T11:30:00Z')
  const upcoming = new Date('2026-06-01T12:30:00Z')

  it('allows an appointment that has started, and correcting a mark', () => {
    expect(canMarkAppointment(appointmentAt(started), now)).toBe(true)
    expect(canMarkAppointment(appointmentAt(started, { status: 'NoShow' }), now)).toBe(true)
  })

  it('refuses one that has not started or was cancelled', () => {
    expect(canMarkAppointment(appointmentAt(upcoming), now)).toBe(false)
    expect(canMarkAppointment(appointmentAt(started, { status: 'Cancelled' }), now)).toBe(false)
  })
})

describe('dayStart', () => {
  it('is local midnight, dayOffset days away', () => {
    const today = dayStart(0)
    const tomorrow = dayStart(1)

    expect(today.getHours()).toBe(0)
    expect(tomorrow.getDate()).toBe(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getDate())
  })
})

describe('defaultDoctor', () => {
  const doctor = (doctorId: number, isActive = true): DoctorDto => ({ doctorId, departmentId: 1, name: `Doctor ${doctorId}`, userId: doctorId, isActive })
  const scheduleFor = (doctorId: number): ScheduleDto => ({
    scheduleId: doctorId,
    doctorId,
    startTime: '2000-01-01T08:00:00Z',
    endTime: '2000-01-01T16:00:00Z',
    slotDurationMin: 30,
    workingDays: ['Monday'],
    breakStartMinute: null,
    breakEndMinute: null,
    timeOff: [],
  })

  it('opens on an active doctor who has a schedule, not the first one listed', () => {
    expect(defaultDoctor([doctor(1), doctor(2)], [scheduleFor(2)])?.doctorId).toBe(2)
  })

  it('skips inactive doctors, even with a schedule', () => {
    expect(defaultDoctor([doctor(1, false), doctor(2)], [scheduleFor(1)])?.doctorId).toBe(2)
  })

  it('falls back to any active doctor, then to none', () => {
    expect(defaultDoctor([doctor(3)], [])?.doctorId).toBe(3)
    expect(defaultDoctor([doctor(4, false)], [])).toBeNull()
  })
})
