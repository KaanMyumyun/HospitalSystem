import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppointmentDto, ScheduleDto } from '../api'
import {
  clinicDate,
  clinicDayStart,
  clinicTimeZone,
  fromWallClock,
  setClinicTimeZone,
  toClinicIsoString,
  wallClock,
} from './clinicTime'
import { formatHourRange, formatLongDate, formatTime, isSameDay } from './format'
import { buildWeekSlots, dateAtTime, dayStart, weekDays, weekRange } from './schedule'

// The suite runs in UTC (vitest.config.ts), where the clinic's hours and
// UTC's coincide and hide any mix-up between the two. These tests set the
// clinic's zone, and some the computer's as well, to show that only the
// clinic's counts.

const nineToFive: ScheduleDto = {
  scheduleId: 1,
  doctorId: 7,
  startTime: '2000-01-01T09:00:00Z',
  endTime: '2000-01-01T17:00:00Z',
  slotDurationMin: 60,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breakStartMinute: null,
  breakEndMinute: null,
  timeOff: [],
}

function appointmentAt(instant: Date): AppointmentDto {
  return {
    appointmentId: 1,
    doctorId: 7,
    doctorName: 'Dr Test',
    patientId: 1,
    patientName: 'Patient Test',
    patientPhoneNumber: '5550100',
    appointmentTime: instant.toISOString(),
    status: 'Scheduled',
  }
}

afterEach(() => {
  setClinicTimeZone('UTC')
  vi.unstubAllEnvs()
})

describe('setClinicTimeZone', () => {
  it('ignores a zone this browser does not know', () => {
    setClinicTimeZone('Europe/Sofia')
    setClinicTimeZone('Not/A_Zone')
    setClinicTimeZone(null)

    expect(clinicTimeZone()).toBe('Europe/Sofia')
  })
})

describe('toClinicIsoString', () => {
  it("writes the clinic's time with its offset, summer and winter", () => {
    setClinicTimeZone('Europe/Sofia')

    expect(toClinicIsoString(new Date('2026-07-01T06:00:00Z'))).toBe('2026-07-01T09:00:00+03:00')
    expect(toClinicIsoString(new Date('2026-12-01T07:00:00Z'))).toBe('2026-12-01T09:00:00+02:00')
  })

  it('writes a negative offset', () => {
    setClinicTimeZone('America/New_York')

    expect(toClinicIsoString(new Date('2026-01-15T14:30:00Z'))).toBe('2026-01-15T09:30:00-05:00')
  })
})

describe('fromWallClock', () => {
  it('reads a clinic time as the API does', () => {
    setClinicTimeZone('Europe/Sofia')

    expect(fromWallClock(Date.UTC(2026, 8, 22, 9, 0)).toISOString()).toBe('2026-09-22T06:00:00.000Z')
  })

  it('moves a time the clocks skip on to the end of the gap', () => {
    setClinicTimeZone('Europe/Sofia')

    // 2026-03-29: 03:00 becomes 04:00, at 01:00 UTC.
    expect(fromWallClock(Date.UTC(2026, 2, 29, 3, 30)).toISOString()).toBe('2026-03-29T01:00:00.000Z')
  })

  it('reads a time the clocks show twice as the second', () => {
    setClinicTimeZone('Europe/Sofia')

    // 2026-10-25: 04:00 becomes 03:00 again, at 01:00 UTC.
    expect(fromWallClock(Date.UTC(2026, 9, 25, 3, 30)).toISOString()).toBe('2026-10-25T01:30:00.000Z')
  })

  it('round-trips with wallClock', () => {
    setClinicTimeZone('Asia/Kolkata')
    const instant = new Date('2026-05-04T03:15:00Z')

    expect(fromWallClock(wallClock(instant)).getTime()).toBe(instant.getTime())
  })
})

describe('clinic days', () => {
  it('starts the day at clinic midnight', () => {
    setClinicTimeZone('Europe/Istanbul')
    const day = clinicDayStart(new Date('2026-09-22T12:00:00Z'))

    expect(day.toISOString()).toBe('2026-09-21T21:00:00.000Z')
    expect(clinicDate(day)).toBe('2026-09-22')
    expect(clinicDayStart(day, 1).toISOString()).toBe('2026-09-22T21:00:00.000Z')
  })

  it('has 23 hours on the day the clocks go forward', () => {
    setClinicTimeZone('Europe/Sofia')
    const day = clinicDayStart(new Date('2026-03-29T12:00:00Z'))

    expect(clinicDayStart(day, 1).getTime() - day.getTime()).toBe(23 * 60 * 60 * 1000)
  })

  it('puts an instant on the clinic date, not the UTC one', () => {
    setClinicTimeZone('Pacific/Kiritimati') // UTC+14
    const late = new Date('2026-09-21T22:30:00Z')

    expect(clinicDate(late)).toBe('2026-09-22')
    expect(formatLongDate(late)).toBe('Tuesday, Sep 22')
    expect(formatTime(late)).toBe('12:30')
    expect(isSameDay(late, new Date('2026-09-22T09:00:00Z'))).toBe(true)
  })
})

describe('the grid in the clinic zone', () => {
  for (const computer of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    describe(`on a computer set to ${computer}`, () => {
      it('shows the working hours as entered', () => {
        vi.stubEnv('TZ', computer)
        setClinicTimeZone('Europe/Istanbul')
        const rows = buildWeekSlots(nineToFive, 7, [], 1)

        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(computer)
        expect(formatHourRange(nineToFive)).toBe('09:00-17:00')
        expect(rows[0]?.[0]?.time).toBe('09:00')
        expect(rows[rows.length - 1]?.[0]?.time).toBe('16:00')
      })

      it('puts an appointment stored as 06:00 UTC in the 09:00 row', () => {
        vi.stubEnv('TZ', computer)
        setClinicTimeZone('Europe/Istanbul')
        const monday = weekDays(1)[0]!
        const rows = buildWeekSlots(nineToFive, 7, [appointmentAt(dateAtTime(monday, '09:00'))], 1)

        expect(dateAtTime(monday, '09:00').getUTCHours()).toBe(6)
        expect(rows[0]?.[0]?.status).toBe('booked')
        expect(rows.slice(1).every((row) => row[0]?.status !== 'booked')).toBe(true)
      })

      it('books the 09:00 row as 09:00 clinic time', () => {
        vi.stubEnv('TZ', computer)
        setClinicTimeZone('Europe/Istanbul')

        expect(toClinicIsoString(dateAtTime(weekDays(1)[0]!, '09:00'))).toMatch(/T09:00:00\+03:00$/)
      })

      it('asks for the week from clinic midnight', () => {
        vi.stubEnv('TZ', computer)
        setClinicTimeZone('Europe/Istanbul')
        const { from, to } = weekRange(1)

        expect(toClinicIsoString(from)).toMatch(/T00:00:00\+03:00$/)
        expect(toClinicIsoString(to)).toMatch(/T00:00:00\+03:00$/)
        expect(formatLongDate(from)).toMatch(/^Monday/)
        expect(clinicDate(dayStart(0))).toBe(clinicDate(new Date()))
      })
    })
  }
})
