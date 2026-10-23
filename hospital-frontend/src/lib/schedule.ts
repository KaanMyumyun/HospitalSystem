import type { AppointmentDto, DayOfWeek, DoctorDto, ScheduleDto } from '../api'
import type { Slot } from '../types'
import { formatHourRange } from './format'
import { clockLabel, scheduleWindow } from './time'

// In Date.getDay() order, like the API's DayOfWeek: Sunday is 0.
const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const mondayFirst: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// What the grid shows for a doctor without a schedule.
const weekdays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function dayName(date: Date): DayOfWeek {
  return dayNames[date.getDay()] ?? 'Sunday'
}

function weekStart(weekOffset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)
  return monday
}

// Midnight starting the day dayOffset days from today, local time.
export function dayStart(dayOffset = 0) {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + dayOffset)
  return day
}

// The dates of the days shown in the week, Monday first.
export function weekDays(weekOffset = 0, shown: readonly DayOfWeek[] = weekdays) {
  const monday = weekStart(weekOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  }).filter((date) => shown.includes(dayName(date)))
}

// Monday 00:00 up to the next Monday 00:00, local time: the whole week, so
// the bookings of any day the doctor works are loaded.
export function weekRange(weekOffset = 0) {
  const from = weekStart(weekOffset)
  const to = new Date(from)
  to.setDate(from.getDate() + 7)
  return { from, to }
}

// The doctor's working days, and any other day of the week that holds a
// booking, such as one made before the day was dropped from the schedule.
export function shownDays(
  schedule: ScheduleDto | undefined,
  appointments: AppointmentDto[] | null,
  weekOffset = 0,
): DayOfWeek[] {
  const days = new Set<DayOfWeek>(schedule?.workingDays ?? weekdays)
  for (const appointment of appointments ?? []) {
    const time = new Date(appointment.appointmentTime)
    if (appointment.status !== 'Cancelled' && isInWeek(time, weekOffset)) days.add(dayName(time))
  }
  return mondayFirst.filter((day) => days.has(day))
}

export function dateAtTime(day: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  const date = new Date(day)
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date
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
  const times: string[] = []

  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
    times.push(clockLabel(minutes))
  }

  return times.map((time) =>
    days.map((day) => {
      if (!appointments) return { day, time, status: 'loading' }

      const slotDate = dateAtTime(day, time)
      const matching = appointments.filter((item) => {
        const appointmentDate = new Date(item.appointmentTime)
        return (
          item.doctorId === doctorId &&
          appointmentDate.getFullYear() === slotDate.getFullYear() &&
          appointmentDate.getMonth() === slotDate.getMonth() &&
          appointmentDate.getDate() === slotDate.getDate() &&
          appointmentDate.getHours() === slotDate.getHours() &&
          appointmentDate.getMinutes() === slotDate.getMinutes()
        )
      })

      const appointment = matching.find((item) => item.status !== 'Cancelled')
      if (appointment) return { day, time, status: 'booked', appointment }

      if (slotDate.getTime() < Date.now()) {
        const cancelled = matching[0]
        return cancelled ? { day, time, status: 'cancelled', appointment: cancelled } : { day, time, status: 'past' }
      }
      if (!schedule.workingDays.includes(dayName(day))) return { day, time, status: 'off' }
      return { day, time, status: 'available' }
    }),
  )
}

export function getNextAvailableSlot(slots: Slot[][]) {
  return slots
    .flat()
    .filter((slot) => slot.status === 'available')
    .sort((left, right) => dateAtTime(left.day, left.time).getTime() - dateAtTime(right.day, right.time).getTime())[0]
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

export function canCancelAppointment(appointment: AppointmentDto, now = Date.now()) {
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
