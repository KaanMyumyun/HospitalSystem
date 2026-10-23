import type { AppointmentStatus, DayOfWeek, DepartmentDto, ScheduleDto } from '../api'
import type { AdminSection, SlotStatus } from '../types'
import { clockLabel, scheduleWindow } from './time'

export function formatDay(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit' })
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

// Reads the clock, so screens call this instead of new Date() while they render.
export function isToday(day: Date) {
  return isSameDay(day, new Date())
}

export function formatLongDate(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit' })
}

export function formatTime(day: Date) {
  return day.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatHourRange(schedule: ScheduleDto) {
  const { startMinutes, endMinutes } = scheduleWindow(schedule)
  return `${clockLabel(startMinutes)}-${clockLabel(endMinutes)}`
}

export function slotLabel(status: SlotStatus) {
  if (status === 'available') return 'Available'
  if (status === 'booked') return 'Booked'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'past') return 'Past'
  if (status === 'loading') return 'Loading'
  if (status === 'off') return 'Day off'
  return 'No schedule'
}

export function initials(name: string) {
  const parts = name.replace(/^Dr\.\s*/i, '').split(' ').filter(Boolean)
  return `${parts[0]?.[0] ?? '?'}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export function adminTitle(section: AdminSection) {
  const titles: Record<AdminSection, string> = {
    departments: 'Departments',
    doctors: 'Doctors',
    schedules: 'Schedules',
    users: 'Users',
    audit: 'Audit log',
  }

  return titles[section]
}

export function departmentName(departments: DepartmentDto[], id: number | undefined) {
  return departments.find((department) => department.id === id)?.name ?? 'Unassigned'
}

export function confirmAction(message: string) {
  return window.confirm(message)
}

export function statusLabel(status: AppointmentStatus) {
  return status === 'NoShow' ? 'No-show' : status
}

// "Mon-Fri" for a run of days in a row, otherwise "Mon, Wed, Sat".
export function formatWorkingDays(days: DayOfWeek[]) {
  const order: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const indexes = days.map((day) => order.indexOf(day)).sort((left, right) => left - right)
  const short = (index: number) => (order[index] ?? '').slice(0, 3)
  const consecutive = indexes.every((index, position) => position === 0 || index === (indexes[position - 1] ?? -2) + 1)
  if (indexes.length > 2 && consecutive) return `${short(indexes[0]!)}-${short(indexes[indexes.length - 1]!)}`
  return indexes.map(short).join(', ')
}
