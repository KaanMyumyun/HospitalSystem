import { describe, expect, it } from 'vitest'
import type { ScheduleDto } from '../api'
import { clockLabel, scheduleWindow, toLocalIsoString } from './time'

function schedule(startTime: string, endTime: string): ScheduleDto {
  return { scheduleId: 1, doctorId: 1, startTime, endTime, slotDurationMin: 30 }
}

describe('scheduleWindow', () => {
  it('reads the hours from the placeholder date', () => {
    expect(scheduleWindow(schedule('2000-01-01T09:00:00Z', '2000-01-01T17:00:00Z'))).toEqual({
      startMinutes: 540,
      endMinutes: 1020,
    })
  })

  it('reads an end hour of 24 as midnight of the next day', () => {
    expect(scheduleWindow(schedule('2000-01-01T20:00:00Z', '2000-01-02T00:00:00Z'))).toEqual({
      startMinutes: 1200,
      endMinutes: 1440,
    })
  })

  it('works for schedules saved on another placeholder date', () => {
    expect(scheduleWindow(schedule('2026-09-21T08:00:00Z', '2026-09-21T12:00:00Z'))).toEqual({
      startMinutes: 480,
      endMinutes: 720,
    })
  })
})

describe('clockLabel', () => {
  it.each([
    [0, '00:00'],
    [545, '09:05'],
    [1440, '24:00'],
  ])('formats %i minutes as %s', (minutes, label) => {
    expect(clockLabel(minutes)).toBe(label)
  })
})

describe('toLocalIsoString', () => {
  it('writes the local time with a +00:00 offset in UTC', () => {
    expect(toLocalIsoString(new Date(2026, 8, 22, 9, 0))).toBe('2026-09-22T09:00:00+00:00')
  })
})
