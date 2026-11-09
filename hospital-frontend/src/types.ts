import type { AppointmentDto, DepartmentDto, DoctorDto, ScheduleDto, UserRole } from './api/client'

export type AdminSection = 'departments' | 'doctors' | 'schedules' | 'users' | 'audit'
export type Screen = 'reception' | 'patients' | 'doctor' | AdminSection
export type SlotStatus = 'available' | 'booked' | 'cancelled' | 'past' | 'empty' | 'loading' | 'off' | 'away' | 'break'
export type Session = { id: string; role: UserRole }
export type HospitalData = {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  schedules: ScheduleDto[]
}
export type Slot = {
  day: Date
  time: string
  status: SlotStatus
  appointment?: AppointmentDto
}
export type ActionOutcome = { ok: true } | { ok: false; error?: string; cause?: unknown }
