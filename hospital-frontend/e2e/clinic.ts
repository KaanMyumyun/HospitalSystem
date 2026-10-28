import { clinicTimeZone } from './settings.ts'

// Clinic dates as yyyy-mm-dd, worked out here rather than with the app's own
// code, so a mistake there cannot hide in what the tests expect.

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

// The days of the week after this one, Monday first: what the reception
// grid shows after Next Week.
export function nextWeek() {
  const today = clinicToday()
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const monday = addDays(today, 8 - (weekday === 0 ? 7 : weekday))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

// The instant the clinic's clock reads `time` on `date`, as the API takes it.
export function clinicInstant(date: string, time: string) {
  const reading = Date.parse(`${date}T${time}:00Z`)
  const guess = reading - offsetAt(reading)
  // Again from the guess, in case a clock change lies between the two.
  return new Date(reading - offsetAt(guess)).toISOString()
}

// How far the clinic's clock is ahead of UTC at an instant, in milliseconds.
function offsetAt(instant: number) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: clinicTimeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return (match[1] === '-' ? -minutes : minutes) * 60_000
}

// How the app writes a date: "Monday, Nov 02" in the grid and the details,
// "Mon, Nov 2" for time off.
export function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  })
}

export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
