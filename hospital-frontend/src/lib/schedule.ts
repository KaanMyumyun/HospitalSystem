import type { AppointmentDto, DoctorDto, ScheduleDto } from '../api'
import type { Slot } from '../types'
import { formatHourRange } from './format'
import { clockLabel, scheduleWindow } from './time'

const daysShown = 5

function weekStart(weekOffset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)
  return monday
}

export function weekDays(weekOffset = 0) {
  const monday = weekStart(weekOffset)

  return Array.from({ length: daysShown }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

// Monday 00:00 up to Saturday 00:00, local time: the days the grid shows.
export function weekRange(weekOffset = 0) {
  const from = weekStart(weekOffset)
  const to = new Date(from)
  to.setDate(from.getDate() + daysShown)
  return { from, to }
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
  const days = weekDays(weekOffset)

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

export function coverageForDepartment(schedules: ScheduleDto[], doctors: DoctorDto[]) {
  const schedule = schedules.find((item) => doctors.some((doctor) => doctor.doctorId === item.doctorId))
  return schedule ? formatHourRange(schedule) : 'Unassigned'
}

export function canCancelAppointment(appointment: AppointmentDto, now = Date.now()) {
  return appointment.status === 'Scheduled' && new Date(appointment.appointmentTime).getTime() > now
}

export function isInWeek(value: Date, weekOffset = 0) {
  const { from, to } = weekRange(weekOffset)
  return value >= from && value < to
}
