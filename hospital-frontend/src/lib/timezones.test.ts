import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AppointmentDto, ScheduleDto } from '../api'
import { formatHourRange } from './format'
import { buildWeekSlots, dateAtTime, weekDays } from './schedule'
import { toLocalIsoString } from './time'

// The rest of the suite runs in UTC, where local and UTC hours coincide and
// hide any mix-up between the two.

const nineToFive: ScheduleDto = {
  scheduleId: 1,
  doctorId: 7,
  startTime: '2000-01-01T09:00:00Z',
  endTime: '2000-01-01T17:00:00Z',
  slotDurationMin: 60,
}

function appointmentAtUtc(iso: string): AppointmentDto {
  return {
    appointmentId: 1,
    doctorId: 7,
    doctorName: 'Dr Test',
    patientId: 1,
    patientName: 'Patient Test',
    patientPhoneNumber: '5550100',
    appointmentTime: iso,
    status: 'Scheduled',
  }
}

function utcIsoForLocalDay(day: Date, utcHour: number) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(utcHour)}:00:00Z`
}

function inTimeZone(zone: string, body: () => void) {
  describe(zone, () => {
    beforeAll(() => {
      vi.stubEnv('TZ', zone)
    })
    afterAll(() => {
      vi.unstubAllEnvs()
    })
    body()
  })
}

inTimeZone('Europe/Istanbul', () => {
  it('shows the working hours as entered, in the header and the grid', () => {
    const rows = buildWeekSlots(nineToFive, 7, [], 1)

    expect(formatHourRange(nineToFive)).toBe('09:00-17:00')
    expect(rows[0]?.[0]?.time).toBe('09:00')
    expect(rows[rows.length - 1]?.[0]?.time).toBe('16:00')
  })

  it('sends the desk time with its offset', () => {
    expect(toLocalIsoString(new Date(2026, 8, 22, 9, 0))).toBe('2026-09-22T09:00:00+03:00')
  })

  it('puts an appointment stored as 06:00 UTC in the 09:00 row', () => {
    const monday = weekDays(1)[0]!
    const rows = buildWeekSlots(nineToFive, 7, [appointmentAtUtc(utcIsoForLocalDay(monday, 6))], 1)

    expect(rows[0]?.[0]?.status).toBe('booked')
    expect(rows.slice(1).every((row) => row[0]?.status !== 'booked')).toBe(true)
  })

  it('books the 09:00 row as 09:00 desk time', () => {
    const monday = weekDays(1)[0]!
    expect(toLocalIsoString(dateAtTime(monday, '09:00'))).toMatch(/T09:00:00\+03:00$/)
  })
})

inTimeZone('America/New_York', () => {
  it('writes a negative offset', () => {
    expect(toLocalIsoString(new Date(2026, 0, 15, 9, 30))).toBe('2026-01-15T09:30:00-05:00')
  })

  it('shows the working hours as entered', () => {
    expect(formatHourRange(nineToFive)).toBe('09:00-17:00')
  })
})
