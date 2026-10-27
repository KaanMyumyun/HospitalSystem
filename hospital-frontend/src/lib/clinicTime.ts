// Every date and time on screen, and every one the desk enters, is the
// clinic's: its wall clock, in the time zone the API names at sign-in,
// whatever zone this computer is set to. A Date is still an instant; these
// read it on the clinic's clock and build it from a clinic time.

const minuteMs = 60_000
const dayMs = 24 * 60 * minuteMs

// Until the API names the clinic's zone, the browser's own.
let zone = Intl.DateTimeFormat().resolvedOptions().timeZone
let readings = readingFormat(zone)

export function clinicTimeZone() {
  return zone
}

// A zone this browser does not know is ignored.
export function setClinicTimeZone(timeZone: string | null | undefined) {
  if (!timeZone || timeZone === zone) return
  try {
    readings = readingFormat(timeZone)
    zone = timeZone
  } catch {
    // A RangeError: Intl has no such zone.
  }
}

function readingFormat(timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
}

// What the clinic's clock shows at an instant, as a Date whose UTC fields are
// that reading: getUTCHours() is the clinic's hour. Like the API's
// ClinicClock.WallClock, and easy to compare and add to.
export function wallClock(instant: Date | number): Date {
  const value: Record<string, number> = {}
  for (const part of readings.formatToParts(instant)) value[part.type] = Number(part.value)
  return new Date(
    Date.UTC(value.year ?? 0, (value.month ?? 1) - 1, value.day ?? 1, value.hour ?? 0, value.minute ?? 0, value.second ?? 0),
  )
}

// How far the clinic's clock is ahead of UTC at an instant, in milliseconds.
function offsetAt(instant: number) {
  return wallClock(instant).getTime() - Math.floor(instant / 1000) * 1000
}

// The instant the clinic's clock shows a reading, as the API's ClinicClock.ToUtc
// reads it: a time skipped when the clocks go forward moves on to the end of
// the gap, and a time shown twice when they go back is the second one.
export function fromWallClock(reading: Date | number): Date {
  const start = new Date(reading).getTime()
  // A gap lasts an hour, or a day where a zone once skipped one.
  for (let wall = start; wall < start + 2 * dayMs; wall += 15 * minuteMs) {
    // The offsets either side, which differ only around a change of the
    // clocks. The smaller one gives the later instant, so it goes first.
    const offsets = [offsetAt(wall - dayMs), offsetAt(wall + dayMs)].sort((left, right) => left - right)
    for (const offset of offsets) {
      if (offsetAt(wall - offset) === offset) return new Date(wall - offset)
    }
  }
  return new Date(start - offsetAt(start))
}

// The reading at the start of the clinic day an instant falls on, addDays later.
function midnightReading(instant: Date | number, addDays = 0) {
  const reading = wallClock(instant)
  return Date.UTC(reading.getUTCFullYear(), reading.getUTCMonth(), reading.getUTCDate() + addDays)
}

// The clinic date an instant falls on, as a date input's value: 2026-09-21.
export function clinicDate(instant: Date | number) {
  return wallClock(instant).toISOString().slice(0, 10)
}

// The clinic's day of the week: 0 is Sunday, as for Date.getDay().
export function clinicWeekday(instant: Date | number) {
  return wallClock(instant).getUTCDay()
}

// The instant the clinic's day begins, addDays days after the one an instant
// falls on.
export function clinicDayStart(instant: Date | number, addDays = 0) {
  return fromWallClock(midnightReading(instant, addDays))
}

// The instant the clinic's clock shows `minutes` after the midnight that
// begins the day `day` falls on.
export function atClinicTime(day: Date, minutes: number) {
  return fromWallClock(midnightReading(day) + minutes * minuteMs)
}

// The clinic's reading with its UTC offset, as the API takes times:
// 2026-09-22T09:00:00+03:00.
export function toClinicIsoString(instant: Date) {
  const offset = Math.round(offsetAt(instant.getTime()) / minuteMs)
  const pad = (value: number) => String(value).padStart(2, '0')
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  return `${wallClock(instant).toISOString().slice(0, 19)}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}
