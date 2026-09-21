import type { ScheduleDto } from '../api'

// Working hours arrive as times on a placeholder date; only the hour numbers count.
export function scheduleWindow(schedule: ScheduleDto) {
  const start = new Date(schedule.startTime)
  const end = new Date(schedule.endTime)
  const midnight = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())

  return {
    startMinutes: (start.getTime() - midnight) / 60_000,
    endMinutes: (end.getTime() - midnight) / 60_000,
  }
}

export function clockLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function toLocalIsoString(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  )
}
