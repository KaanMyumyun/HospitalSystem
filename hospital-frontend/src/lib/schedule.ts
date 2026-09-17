import type { AppointmentDto, DoctorDto, ScheduleDto } from '../api'
import type { Slot } from '../types'
import { formatHourRange } from './format'

export function weekDays(weekOffset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

export function dateAtTime(day: Date, time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  const date = new Date(day)
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date
}

export function buildWeekSlots(
  schedule: ScheduleDto | undefined,
  doctorId: number | undefined,
  appointments: AppointmentDto[],
  weekOffset = 0,
): Slot[][] {
  const days = weekDays(weekOffset)

  if (!schedule || !doctorId) {
    return Array.from({ length: 5 }, (_, rowIndex) =>
      days.map((day) => ({ day, time: rowIndex === 0 ? 'No schedule' : '', status: 'empty' })),
    )
  }

  const startHour = new Date(schedule.startTime).getUTCHours()
  const endHour = new Date(schedule.endTime).getUTCHours()
  const duration = schedule.slotDurationMin || 30
  const times: string[] = []

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += duration) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }

  return times.map((time) =>
    days.map((day) => {
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

      // A slot can hold a cancelled appointment and the booking that replaced it.
      const appointment = matching.find((item) => item.status !== 'Cancelled')
      if (appointment) return { day, time, status: 'booked', appointment }

      // Cancelling frees the slot. Past slots keep showing the cancellation,
      // since they cannot be booked anyway.
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
  const days = weekDays(weekOffset)
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return false

  const end = new Date(last)
  end.setDate(last.getDate() + 1)
  return value >= first && value < end
}
