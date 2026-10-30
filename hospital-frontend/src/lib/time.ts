import type { ScheduleDto } from '../api'

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
