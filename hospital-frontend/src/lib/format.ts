import type { AppointmentStatus, DayOfWeek, DepartmentDto, ScheduleDto, TimeOffDto } from '../api'
import type { AdminSection, SlotStatus } from '../types'
import { clinicDate, clinicTimeZone } from './clinicTime'
import { clockLabel, scheduleWindow } from './time'

// Dates and times show on the clinic's clock (clinicTime.ts).
export function formatDay(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', timeZone: clinicTimeZone() })
}

export function isSameDay(left: Date, right: Date) {
  return clinicDate(left) === clinicDate(right)
}

// Reads the clock, so screens call this instead of new Date() while they render.
export function isToday(day: Date) {
  return isSameDay(day, new Date())
}

export function formatLongDate(day: Date) {
  return day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', timeZone: clinicTimeZone() })
}

export function formatTime(day: Date) {
  return day.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: clinicTimeZone() })
}

// A clinic date such as 2026-09-21, from a date input or the API: "Mon, Sep 21".
export function formatClinicDate(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// "Mon, Sep 21" for one day, "Mon, Sep 21 - Fri, Sep 25" for several.
export function formatTimeOff(timeOff: Pick<TimeOffDto, 'firstDay' | 'lastDay'>) {
  return timeOff.firstDay === timeOff.lastDay
    ? formatClinicDate(timeOff.firstDay)
    : `${formatClinicDate(timeOff.firstDay)} - ${formatClinicDate(timeOff.lastDay)}`
}

// The schedule's break as "12:00-13:00", or null for none.
export function formatBreak(schedule: Pick<ScheduleDto, 'breakStartMinute' | 'breakEndMinute'>) {
  return schedule.breakStartMinute != null && schedule.breakEndMinute != null
    ? `${clockLabel(schedule.breakStartMinute)}-${clockLabel(schedule.breakEndMinute)}`
    : null
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
  if (status === 'away') return 'Away'
  if (status === 'break') return 'Break'
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

// What happened to a booking, from its audit log action.
export function historyActionLabel(action: string) {
  const labels: Record<string, string> = {
    CreateAppointment: 'Booked',
    MoveAppointment: 'Moved',
    CancelAppointment: 'Cancelled',
    ChangeAppointmentStatus: 'Marked',
  }
  return labels[action] ?? action
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
