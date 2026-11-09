import { clinicTimeZone } from './settings.ts'

export function clinicToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: clinicTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDays(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

export function nextWeek() {
  const today = clinicToday()
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const monday = addDays(today, 8 - (weekday === 0 ? 7 : weekday))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function clinicInstant(date: string, time: string) {
  const reading = Date.parse(`${date}T${time}:00Z`)
  const guess = reading - offsetAt(reading)
  return new Date(reading - offsetAt(guess)).toISOString()
}

function offsetAt(instant: number) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: clinicTimeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return (match[1] === '-' ? -minutes : minutes) * 60_000
}

function label(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' })
}

export function longDate(date: string) {
  return label(date, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function mediumDate(date: string) {
  return label(date, { weekday: 'short', day: 'numeric', month: 'short' })
}
