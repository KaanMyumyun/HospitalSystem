import type { AppointmentDto, DayOfWeek, DoctorDto, ScheduleDto } from '../api'
import type { Slot } from '../types'
import { atClinicTime, clinicDate, clinicDayStart, clinicWeekday, wallClock } from './clinicTime'
import { formatHourRange } from './format'
import { clockLabel, scheduleWindow } from './time'

// Days and times here are the clinic's (clinicTime.ts). A day is the instant
// the clinic's day begins.

const minuteMs = 60_000

// In Date.getDay() order, like the API's DayOfWeek: Sunday is 0.
const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const mondayFirst: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// What the grid shows for a doctor without a schedule.
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

// Midnight starting the day dayOffset days from today.
export function dayStart(dayOffset = 0) {
  return clinicDayStart(new Date(), dayOffset)
}

// The days shown in the week, Monday first.
export function weekDays(weekOffset = 0, shown: readonly DayOfWeek[] = weekdays) {
  const monday = weekStart(weekOffset)
  return Array.from({ length: 7 }, (_, index) => clinicDayStart(monday, index)).filter((date) =>
    shown.includes(dayName(date)),
  )
}

// Monday 00:00 up to the next Monday 00:00: the whole week, so the bookings
// of any day the doctor works are loaded.
export function weekRange(weekOffset = 0) {
  const from = weekStart(weekOffset)
  return { from, to: clinicDayStart(from, 7) }
}

// The doctor's working days, and any other day of the week that holds a
// booking, such as one made before the day was dropped from the schedule.
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

// The instant a slot starts: its time on the clinic's clock, that day.
export function dateAtTime(day: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return atClinicTime(day, Number(hour) * 60 + Number(minute))
}

// Whether the doctor is away on a clinic date (2026-09-21) for time off.
export function isAway(schedule: ScheduleDto, date: string) {
  // An API older than this build sends no time off.
  return (schedule.timeOff ?? []).some((timeOff) => timeOff.firstDay <= date && date <= timeOff.lastDay)
}

// Whether a slot starting `minutes` after midnight overlaps the doctor's break.
export function isInBreak(schedule: ScheduleDto, minutes: number) {
  const { breakStartMinute: start, breakEndMinute: end } = schedule
  return start != null && end != null && minutes < end && minutes + schedule.slotDurationMin > start
}

// appointments is null while the week is still loading; its slots stay
// unclickable rather than showing as open.
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

  // The doctor's appointments by the minute they start on the clinic's clock
  // (a reading's time / 60 000), in the order the API listed them, so each
  // slot finds its own with one lookup.
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

// The earliest open slot: by day, then by time, whose labels sort as text.
export function getNextAvailableSlot(slots: Slot[][]) {
  return slots
    .flat()
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => left.day.getTime() - right.day.getTime() || (left.time < right.time ? -1 : 1))[0]
}

// The doctor the reception calendar opens on: an active one with a schedule
// when there is one, so the desk does not start on an empty week.
export function defaultDoctor(doctors: DoctorDto[], schedules: ScheduleDto[]) {
  const active = doctors.filter((doctor) => doctor.isActive)
  return active.find((doctor) => schedules.some((schedule) => schedule.doctorId === doctor.doctorId)) ?? active[0] ?? null
}

export function coverageForDepartment(schedules: ScheduleDto[], doctors: DoctorDto[]) {
  const schedule = schedules.find((item) => doctors.some((doctor) => doctor.doctorId === item.doctorId))
  return schedule ? formatHourRange(schedule) : 'Unassigned'
}

// Scheduled and not yet started: the desk can still move or cancel it.
export function isUpcoming(appointment: AppointmentDto, now = Date.now()) {
  return appointment.status === 'Scheduled' && new Date(appointment.appointmentTime).getTime() > now
}

// Once it has started, an appointment that was not cancelled can be marked
// completed or no-show, and a mark can be corrected.
export function canMarkAppointment(appointment: AppointmentDto, now = Date.now()) {
  return appointment.status !== 'Cancelled' && new Date(appointment.appointmentTime).getTime() <= now
}

export function isInWeek(value: Date, weekOffset = 0) {
  const { from, to } = weekRange(weekOffset)
  return value >= from && value < to
}
