import type { DepartmentDto, ScheduleDto } from '../api'
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
  }

  return titles[section]
}

export function departmentName(departments: DepartmentDto[], id: number | undefined) {
  return departments.find((department) => department.id === id)?.name ?? 'Unassigned'
}

export function confirmAction(message: string) {
  return window.confirm(message)
}
