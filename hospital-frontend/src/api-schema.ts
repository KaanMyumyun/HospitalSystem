// Generated from openapi.json by scripts/generate-api-types.mjs. Do not edit:
// run `npm run generate:api` instead.

export type AddTimeOffDto = {
  firstDay: string
  lastDay: string
  reason?: string | null
  cancelAffectedAppointments?: boolean
  cancellationReason?: string | null
}

export type AffectedAppointmentDto = {
  appointmentId: number
  appointmentTime: string
  doctorName: string
  patientInitials: string
}

export type AppointmentHistoryEntryDto = {
  createdAt: string
  action: string
  details: string
  actor: string
}

export type AppointmentHistoryEntryDtoListServiceResult = {
  isSuccess: boolean
  error: string | null
  data: AppointmentHistoryEntryDto[] | null
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow'

export type AppointmentStatusResultDto = {
  isSuccess: boolean
  error: string | null
}

export type AuditLogEntryDto = {
  id: number
  createdAt: string
  action: string
  entityType: string
  entityId: number
  details: string
  actor: string
}

export type AuditLogEntryDtoPagedResult = {
  items: AuditLogEntryDto[]
  totalCount: number
  page: number
  pageSize: number
}

export type AuditLogEntryDtoPagedResultServiceResult = {
  isSuccess: boolean
  error: string | null
  data: AuditLogEntryDtoPagedResult | null
}

export type CalendarActionResult = {
  isSuccess: boolean
  error: string | null
  affectedAppointmentCount: number
  affectedAppointments: AffectedAppointmentDto[] | null
}

export type CancelAppointmentDto = {
  reason?: string
}

export type CancelAppointmentResultDto = {
  isSuccess: boolean
  error: string | null
}

export type ChangeAppointmentStatusDto = {
  status: AppointmentStatus
}

export type ChangeDepartmentStatusDto = {
  isActive: boolean
  cancelAffectedAppointments?: boolean
  cancellationReason?: string | null
}

export type ChangeDoctorDepartmentDto = {
  departmentId?: number
}

export type ChangeDoctorStatusDto = {
  isActive: boolean
  cancelAffectedAppointments?: boolean
  cancellationReason?: string | null
}

export type ChangeDoctorsStatus = {
  doctorId: number
  isActive: boolean
  userId: number
  userName: string
}

export type ChangeDoctorsStatusResult = {
  isSuccess: boolean
  error: string | null
  affectedAppointmentCount: number
  affectedAppointments: AffectedAppointmentDto[] | null
  name: ChangeDoctorsStatus | null
}

export type ChangePasswordDto = {
  currentPassword: string
  newPassword: string
}

export type ChangePasswordResultDto = {
  isSuccess: boolean
  error: string | null
  token: string | null
}

export type ChangeRoleDto = {
  newRole?: UserRole
  departmentId?: number | null
  cancelAffectedAppointments?: boolean
  cancellationReason?: string | null
}

export type ChangeRoleResultDto = {
  isSuccess: boolean
  error: string | null
  affectedAppointmentCount: number
  affectedAppointments: AffectedAppointmentDto[] | null
}

export type ChangeScheduleDto = {
  startHour?: number
  endHour?: number
  slotDurationMin?: number
  workingDays?: DayOfWeek[] | null
  breakStartMinute?: number | null
  breakEndMinute?: number | null
  cancelAffectedAppointments?: boolean
  cancellationReason?: string | null
}

export type CreateAppointmentDto = {
  doctorId?: number
  patientName: string
  phoneNumber: string
  dateOfBirth: string
  appointmentTime: string
  patientId?: number | null
  createNewPatient?: boolean
}

export type CreateAppointmentResultDto = {
  isSuccess: boolean
  error: string | null
  isConflict: boolean
  possibleMatches: PatientMatchDto[] | null
}

export type CreateDepartmentDto = {
  name: string
}

export type CreateDoctorDto = {
  userId?: number
  departmentId?: number
}

export type CreateDoctorResultDto = {
  isSuccess: boolean
  error: string | null
}

export type CreateSchedule = {
  doctorId?: number
  startHour?: number
  endHour?: number
  slotDurationMin?: number
  workingDays?: DayOfWeek[] | null
  breakStartMinute?: number | null
  breakEndMinute?: number | null
}

export type CreateUserDto = {
  name: string
  password: string
}

export type CreateUserResultDto = {
  isSuccess: boolean
  error: string | null
}

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

export type DemoLoginDto = {
  role?: UserRole
}

export type DepartmentActionResultDto = {
  isSuccess: boolean
  error: string | null
  affectedAppointmentCount: number
  affectedAppointments: AffectedAppointmentDto[] | null
}

export type DoctorDisplayDto = {
  doctorId: number
  departmentId: number
  userId: number
  name: string
  isActive: boolean
}

export type DoctorDisplayDtoListServiceResult = {
  isSuccess: boolean
  error: string | null
  data: DoctorDisplayDto[] | null
}

export type LoginDto = {
  name: string
  password: string
}

export type LoginResultDto = {
  isSuccess: boolean
  token: string | null
  role: UserRole | null
  error: string | null
  timeZone: string | null
}

export type MoveAppointmentDto = {
  doctorId?: number | null
  appointmentTime: string
}

export type MoveAppointmentResultDto = {
  isSuccess: boolean
  error: string | null
}

export type PatientActionResultDto = {
  isSuccess: boolean
  error: string | null
}

export type PatientAppointmentDto = {
  appointmentId: number
  appointmentTime: string
  doctorId: number
  doctorName: string
  status: AppointmentStatus
  cancellationReason: string | null
}

export type PatientDetailsDto = {
  patientId: number
  name: string
  dateOfBirth: string
  phoneNumber: string
  appointments: PatientAppointmentDto[]
}

export type PatientDetailsDtoServiceResult = {
  isSuccess: boolean
  error: string | null
  data: PatientDetailsDto | null
}

export type PatientMatchDto = {
  patientId: number
  name: string
  dateOfBirth: string
  phoneNumber: string
}

export type PatientSummaryDto = {
  patientId: number
  name: string
  dateOfBirth: string
  phoneNumber: string
}

export type PatientSummaryDtoPagedResult = {
  items: PatientSummaryDto[]
  totalCount: number
  page: number
  pageSize: number
}

export type PatientSummaryDtoPagedResultServiceResult = {
  isSuccess: boolean
  error: string | null
  data: PatientSummaryDtoPagedResult | null
}

export type ResetPasswordDto = {
  newPassword: string
}

export type ResetPasswordResultDto = {
  isSuccess: boolean
  error: string | null
}

export type TimeOffDto = {
  timeOffId: number
  firstDay: string
  lastDay: string
  reason: string | null
}

export type UpdatePatientDto = {
  name: string
  phoneNumber: string
  dateOfBirth: string
}

export type UserDisplayDto = {
  userId: number
  userName: string
  role: UserRole
  lockedUntil: string | null
}

export type UserDisplayDtoPagedResult = {
  items: UserDisplayDto[]
  totalCount: number
  page: number
  pageSize: number
}

export type UserDisplayDtoPagedResultServiceResult = {
  isSuccess: boolean
  error: string | null
  data: UserDisplayDtoPagedResult | null
}

export type UserRole = 'Pending' | 'Admin' | 'Doctor' | 'FrontDesk' | 'DemoAdmin' | 'DemoFrontDesk'

export type ViewAppointmentDto = {
  appointmentId: number
  doctorId: number
  doctorName: string
  patientId: number
  patientName: string
  patientPhoneNumber: string
  appointmentTime: string
  status: AppointmentStatus
}

export type ViewAppointmentDtoListServiceResult = {
  isSuccess: boolean
  error: string | null
  data: ViewAppointmentDto[] | null
}

export type ViewDepartmentDto = {
  id: number
  name: string
  isActive: boolean
}

export type ViewDepartmentDtoListServiceResult = {
  isSuccess: boolean
  error: string | null
  data: ViewDepartmentDto[] | null
}

export type ViewSchedule = {
  scheduleId: number
  doctorId: number
  startTime: string
  endTime: string
  slotDurationMin: number
  workingDays: DayOfWeek[]
  breakStartMinute: number | null
  breakEndMinute: number | null
  timeOff: TimeOffDto[]
}

export type ViewScheduleListServiceResult = {
  isSuccess: boolean
  error: string | null
  data: ViewSchedule[] | null
}
