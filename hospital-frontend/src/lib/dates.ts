import { clinicDate, clinicTimeZone, wallClock } from './clinicTime'
import { clockLabel } from './time'

function inClinic(instant: Date | number, options: Intl.DateTimeFormatOptions) {
  return new Date(instant).toLocaleDateString('en-GB', { ...options, timeZone: clinicTimeZone() })
}

export function weekdayShort(day: Date | number) {
  return inClinic(day, { weekday: 'short' })
}

export function weekdayLong(day: Date | number) {
  return inClinic(day, { weekday: 'long' })
}

export function dayOfMonth(day: Date | number) {
  return inClinic(day, { day: 'numeric' })
}

export function longDate(day: Date | number) {
  return inClinic(day, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function mediumDate(day: Date | number) {
  return inClinic(day, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function fullDate(day: Date | number) {
  return inClinic(day, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function timeOf(instant: Date | number) {
  const reading = wallClock(instant)
  return clockLabel(reading.getUTCHours() * 60 + reading.getUTCMinutes())
}

export function minutesOfDay(instant: Date | number) {
  const reading = wallClock(instant)
  return reading.getUTCHours() * 60 + reading.getUTCMinutes()
}

export function weekRangeLabel(from: Date, lastDay: Date) {
  const start = wallClock(from)
  const end = wallClock(lastDay)
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()
  const month = (reading: Date, style: 'long' | 'short') =>
    reading.toLocaleDateString('en-GB', { month: style, timeZone: 'UTC' })
  if (sameMonth) return `${start.getUTCDate()}–${end.getUTCDate()} ${month(end, 'long')} ${end.getUTCFullYear()}`
  if (sameYear) {
    return `${start.getUTCDate()} ${month(start, 'short')} – ${end.getUTCDate()} ${month(end, 'short')} ${end.getUTCFullYear()}`
  }
  return `${start.getUTCDate()} ${month(start, 'short')} ${start.getUTCFullYear()} – ${end.getUTCDate()} ${month(end, 'short')} ${end.getUTCFullYear()}`
}

export function relativeDay(day: Date | number, now: Date | number = Date.now()) {
  const target = clinicDate(day)
  const today = clinicDate(now)
  if (target === today) return 'Today'
  const shift = (offset: number) => {
    const reading = wallClock(now)
    return new Date(
      Date.UTC(reading.getUTCFullYear(), reading.getUTCMonth(), reading.getUTCDate() + offset),
    )
      .toISOString()
      .slice(0, 10)
  }
  if (target === shift(1)) return 'Tomorrow'
  if (target === shift(-1)) return 'Yesterday'
  return null
}

export function dateOnlyLabel(value: string, style: 'short' | 'long' = 'short') {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function dateOnlyShort(value: string) {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function ageOn(dateOfBirth: string, on: string) {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = dateOfBirth.split('-').map(Number)
  const [year = 0, month = 1, day = 1] = on.split('-').map(Number)
  let age = year - birthYear
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age--
  return Math.max(0, age)
}

export function greeting(now: Date | number = Date.now()) {
  const hour = wallClock(now).getUTCHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function zoneCity(zone: string = clinicTimeZone()) {
  const last = zone.split('/').pop() ?? zone
  return last.replace(/_/g, ' ')
}

export function addMinutes(time: string, minutes: number) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const total = (hour * 60 + minute + minutes) % (24 * 60)
  return clockLabel(total)
}
