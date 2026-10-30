const minuteMs = 60_000
const dayMs = 24 * 60 * minuteMs

let zone = Intl.DateTimeFormat().resolvedOptions().timeZone
let readings = readingFormat(zone)

export function clinicTimeZone() {
  return zone
}

export function setClinicTimeZone(timeZone: string | null | undefined) {
  if (!timeZone || timeZone === zone) return
  try {
    readings = readingFormat(timeZone)
    zone = timeZone
  } catch {
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

export function wallClock(instant: Date | number): Date {
  const value: Record<string, number> = {}
  for (const part of readings.formatToParts(instant)) value[part.type] = Number(part.value)
  return new Date(
    Date.UTC(value.year ?? 0, (value.month ?? 1) - 1, value.day ?? 1, value.hour ?? 0, value.minute ?? 0, value.second ?? 0),
  )
}

function offsetAt(instant: number) {
  return wallClock(instant).getTime() - Math.floor(instant / 1000) * 1000
}

export function fromWallClock(reading: Date | number): Date {
  const start = new Date(reading).getTime()
  for (let wall = start; wall < start + 2 * dayMs; wall += 15 * minuteMs) {
    const offsets = [offsetAt(wall - dayMs), offsetAt(wall + dayMs)].sort((left, right) => left - right)
    for (const offset of offsets) {
      if (offsetAt(wall - offset) === offset) return new Date(wall - offset)
    }
  }
  return new Date(start - offsetAt(start))
}

function midnightReading(instant: Date | number, addDays = 0) {
  const reading = wallClock(instant)
  return Date.UTC(reading.getUTCFullYear(), reading.getUTCMonth(), reading.getUTCDate() + addDays)
}

export function clinicDate(instant: Date | number) {
  return wallClock(instant).toISOString().slice(0, 10)
}

export function clinicWeekday(instant: Date | number) {
  return wallClock(instant).getUTCDay()
}

export function clinicDayStart(instant: Date | number, addDays = 0) {
  return fromWallClock(midnightReading(instant, addDays))
}

export function atClinicTime(day: Date, minutes: number) {
  return fromWallClock(midnightReading(day) + minutes * minuteMs)
}

export function toClinicIsoString(instant: Date) {
  const offset = Math.round(offsetAt(instant.getTime()) / minuteMs)
  const pad = (value: number) => String(value).padStart(2, '0')
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  return `${wallClock(instant).toISOString().slice(0, 19)}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}
