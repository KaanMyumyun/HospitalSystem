import type { AppointmentDto, DepartmentDto, DoctorDto, ScheduleDto, UserRole } from './api'

export type AdminSection = 'departments' | 'doctors' | 'schedules' | 'users'
export type Screen = 'reception' | AdminSection
export type SlotStatus = 'available' | 'booked' | 'cancelled' | 'past' | 'empty' | 'loading'
export type Session = { token: string; role: UserRole }
export type HospitalData = {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  schedules: ScheduleDto[]
}
export type ActivityEntry = {
  id: string
  message: string
  at: string
}
export type Slot = {
  day: Date
  time: string
  status: SlotStatus
  appointment?: AppointmentDto
}
export type ActionOutcome = { ok: true } | { ok: false; error?: string }
