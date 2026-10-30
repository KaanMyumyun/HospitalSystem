import type { AppointmentDto, DayOfWeek, DoctorDto, ScheduleDto } from '../api'
import type { Slot } from '../types'
import { atClinicTime, clinicDate, clinicDayStart, clinicWeekday, wallClock } from './clinicTime'
import { formatHourRange } from './format'
import { clockLabel, scheduleWindow } from './time'

const minuteMs = 60_000

const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const mondayFirst: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function dayName(date: Date): DayOfWeek {
  return dayNames[clinicWeekday(date)] ?? 'Sunday'
}

function weekStart(weekOffset: number) {
  const now = new Date()
  const day = clinicWeekday(now)
  const mondayOffset = day === 0 ? -6 : 1 - day
  return clinicDayStart(now, mondayOffset + weekOffset * 7)
}

export function dayStart(dayOffset = 0) {
  return clinicDayStart(new Date(), dayOffset)
}

export function weekDays(weekOffset = 0, shown: readonly DayOfWeek[] = weekdays) {
  const monday = weekStart(weekOffset)
  return Array.from({ length: 7 }, (_, index) => clinicDayStart(monday, index)).filter((date) =>
    shown.includes(dayName(date)),
  )
}

export function weekRange(weekOffset = 0) {
  const from = weekStart(weekOffset)
  return { from, to: clinicDayStart(from, 7) }
}

export function shownDays(
  schedule: ScheduleDto | undefined,
  appointments: AppointmentDto[] | null,
  weekOffset = 0,
): DayOfWeek[] {
  const days = new Set<DayOfWeek>(schedule?.workingDays ?? weekdays)
  const { from, to } = weekRange(weekOffset)
  for (const appointment of appointments ?? []) {
    const time = new Date(appointment.appointmentTime)
    if (appointment.status !== 'Cancelled' && time >= from && time < to) days.add(dayName(time))
  }
  return mondayFirst.filter((day) => days.has(day))
}

export function dateAtTime(day: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return atClinicTime(day, Number(hour) * 60 + Number(minute))
}

export function isAway(schedule: ScheduleDto, date: string) {
  return (schedule.timeOff ?? []).some((timeOff) => timeOff.firstDay <= date && date <= timeOff.lastDay)
}

export function isInBreak(schedule: ScheduleDto, minutes: number) {
  const { breakStartMinute: start, breakEndMinute: end } = schedule
  return start != null && end != null && minutes < end && minutes + schedule.slotDurationMin > start
}

export function buildWeekSlots(
  schedule: ScheduleDto | undefined,
  doctorId: number | undefined,
  appointments: AppointmentDto[] | null,
  weekOffset = 0,
): Slot[][] {
  const days = weekDays(weekOffset, shownDays(schedule, appointments, weekOffset))

  if (!schedule || !doctorId) {
    return Array.from({ length: 5 }, (_, rowIndex) =>
      days.map((day) => ({ day, time: rowIndex === 0 ? 'No schedule' : '', status: 'empty' })),
    )
  }

  const { startMinutes, endMinutes } = scheduleWindow(schedule)
  const duration = schedule.slotDurationMin || 30
  const starts: number[] = []

  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
    starts.push(minutes)
  }

  const byMinute = new Map<number, AppointmentDto[]>()
  for (const item of appointments ?? []) {
    if (item.doctorId !== doctorId) continue
    const key = Math.floor(wallClock(new Date(item.appointmentTime)).getTime() / minuteMs)
    const atMinute = byMinute.get(key)
    if (atMinute) atMinute.push(item)
    else byMinute.set(key, [item])
  }

  const now = wallClock(new Date()).getTime()
  const columns = days.map((day) => ({
    day,
    midnight: wallClock(day).getTime(),
    works: schedule.workingDays.includes(dayName(day)),
    away: isAway(schedule, clinicDate(day)),
  }))

  return starts.map((minutes) => {
    const time = clockLabel(minutes)
    const onBreak = isInBreak(schedule, minutes)

    return columns.map(({ day, midnight, works, away }): Slot => {
      if (!appointments) return { day, time, status: 'loading' }

      const start = midnight + minutes * minuteMs
      const matching = byMinute.get(start / minuteMs) ?? []

      const appointment = matching.find((item) => item.status !== 'Cancelled')
      if (appointment) return { day, time, status: 'booked', appointment }

      if (start < now) {
        const cancelled = matching[0]
        return cancelled ? { day, time, status: 'cancelled', appointment: cancelled } : { day, time, status: 'past' }
      }
      if (!works) return { day, time, status: 'off' }
      if (away) return { day, time, status: 'away' }
      if (onBreak) return { day, time, status: 'break' }
      return { day, time, status: 'available' }
    })
  })
}

export function getNextAvailableSlot(slots: Slot[][]) {
  return slots
    .flat()
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => left.day.getTime() - right.day.getTime() || (left.time < right.time ? -1 : 1))[0]
}

export function defaultDoctor(doctors: DoctorDto[], schedules: ScheduleDto[]) {
  const active = doctors.filter((doctor) => doctor.isActive)
  return active.find((doctor) => schedules.some((schedule) => schedule.doctorId === doctor.doctorId)) ?? active[0] ?? null
}

export function coverageForDepartment(schedules: ScheduleDto[], doctors: DoctorDto[]) {
  const schedule = schedules.find((item) => doctors.some((doctor) => doctor.doctorId === item.doctorId))
  return schedule ? formatHourRange(schedule) : 'Unassigned'
}

export function isUpcoming(appointment: AppointmentDto, now = Date.now()) {
  return appointment.status === 'Scheduled' && new Date(appointment.appointmentTime).getTime() > now
}

export function canMarkAppointment(appointment: AppointmentDto, now = Date.now()) {
  return appointment.status !== 'Cancelled' && new Date(appointment.appointmentTime).getTime() <= now
}

export function isInWeek(value: Date, weekOffset = 0) {
  const { from, to } = weekRange(weekOffset)
  return value >= from && value < to
}
