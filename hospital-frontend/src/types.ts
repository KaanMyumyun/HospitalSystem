import type { AppointmentDto, DepartmentDto, DoctorDto, ScheduleDto, UserRole } from './api'

export type AdminSection = 'departments' | 'doctors' | 'schedules' | 'users' | 'audit'
export type Screen = 'reception' | 'patients' | 'doctor' | AdminSection
// off: a day the doctor does not work, shown because it holds a booking.
export type SlotStatus = 'available' | 'booked' | 'cancelled' | 'past' | 'empty' | 'loading' | 'off'
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
// cause is the error the action threw, for screens that handle some errors themselves.
export type ActionOutcome = { ok: true } | { ok: false; error?: string; cause?: unknown }
