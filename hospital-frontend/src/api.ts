export type UserRole = 'Pending' | 'Admin' | 'Doctor' | 'FrontDesk' | 'DemoAdmin' | 'DemoFrontDesk'

export type LoginResult = {
  isSuccess: boolean
  token?: string
  role?: UserRole
  error?: string
}

export type DepartmentDto = {
  id: number
  name: string
  isActive: boolean
}

export type DoctorDto = {
  doctorId: number
  departmentId: number
  userId: number
  name: string
  isActive: boolean
}

export type UserDto = {
  userId: number
  userName: string
  role: UserRole
}

export type ScheduleDto = {
  scheduleId: number
  doctorId: number
  startTime: string
  endTime: string
  slotDurationMin: number
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow'

export type AppointmentDto = {
  appointmentId: number
  doctorId: number
  doctorName: string
  patientId: number
  patientName: string
  patientPhoneNumber: string
  appointmentTime: string
  status: AppointmentStatus
}

export type CreateAppointmentInput = {
  DoctorId: number
  PatientName: string
  PhoneNumber: string
  DateOfBirth: string
  AppointmentTime: string
}

export type CancelAppointmentInput = {
  AppointmentId: number
  Status: 'Cancelled'
  Reason: string
}

export type CreateScheduleInput = {
  DoctorId: number
  StartHour: number
  EndHour: number
  SlotDurationMin: number
}

export type ChangeScheduleInput = CreateScheduleInput & {
  ScheduleId: number
}

type ServiceResult<T> = {
  isSuccess?: boolean
  IsSuccess?: boolean
  data?: T
  Data?: T
  error?: string
  Error?: string
}

const API_ORIGIN = resolveApiOrigin(import.meta.env.VITE_API_URL)

function resolveApiOrigin(value?: string) {
  const base = (value?.trim() || 'http://localhost:5272/api').replace(/\/+$/, '')
  return base.endsWith('/api') ? base.slice(0, -4) : base
}

function apiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN}${cleanPath.startsWith('/api/') ? cleanPath : `/api${cleanPath}`}`
}

export function getStoredSession() {
  const token = localStorage.getItem('hospital-ui-v2-token')
  const role = localStorage.getItem('hospital-ui-v2-role') as UserRole | null
  return token && role ? { token, role } : null
}

export function storeSession(token: string, role: UserRole) {
  localStorage.setItem('hospital-ui-v2-token', token)
  localStorage.setItem('hospital-ui-v2-role', role)
}

export function clearSession() {
  localStorage.removeItem('hospital-ui-v2-token')
  localStorage.removeItem('hospital-ui-v2-role')
}

export async function login(name: string, password: string): Promise<LoginResult> {
  try {
    const result = await request<LoginResult>('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    })

    if (result.isSuccess && result.token && result.role) {
      storeSession(result.token, result.role)
    }

    return result
  } catch (error) {
    return { isSuccess: false, error: getErrorMessage(error) }
  }
}

export async function loadHospitalData(role: UserRole) {
  const [departments, doctors, users, schedules, appointments] = await Promise.all([
    getServiceResult<unknown[]>('/api/Department/ViewDepartment').then((items) => items.map(normalizeDepartment)),
    getServiceResult<unknown[]>('/api/Users/ListDoctors').then((items) => items.map(normalizeDoctor)),
    getServiceResult<unknown[]>('/api/Users/ListUsers').then((items) => items.map(normalizeUser)),
    getServiceResult<unknown[]>('/api/schedule/list-schedule').then((items) => items.map(normalizeSchedule)),
    canReadAppointments(role)
      ? getServiceResult<unknown[]>('/api/Appointments/ListAppointments').then((items) =>
          items.map(normalizeAppointment),
        )
      : Promise.resolve([]),
  ])

  return { departments, doctors, users, schedules, appointments }
}

export async function createAppointment(input: CreateAppointmentInput) {
  return postAction('/api/Appointments/CreateAppointment', input)
}

export async function cancelAppointment(input: CancelAppointmentInput) {
  return postAction('/api/Appointments/CancelAppointment', input)
}

export async function createDepartment(name: string) {
  return postAction('/api/Department/CreateDepartment', { Name: name })
}

export async function changeDepartmentStatus(departmentId: number, isActive: boolean) {
  return postAction('/api/Department/ChangeDepartmentStatus', { DepartmentId: departmentId, IsActive: isActive })
}

export async function createUser(name: string, password: string) {
  return postAction('/api/Auth/CreateUser', { name, password })
}

export async function changeUserRole(userId: number, newRole: UserRole) {
  return postAction('/api/Users/change-role', { UserId: userId, NewRole: newRole })
}

export async function resetPassword(userId: number, newPassword: string) {
  return postAction('/api/Users/reset-password', { UserId: userId, NewPassword: newPassword })
}

export async function changeDoctorStatus(doctor: DoctorDto, isActive: boolean) {
  return postAction('/api/Users/change-doctor-status', {
    DoctorId: doctor.doctorId,
    IsActive: isActive,
    UserId: doctor.userId,
    UserName: doctor.name,
  })
}

export async function changeDoctorDepartment(doctorId: number, departmentId: number) {
  return postAction('/api/Department/ChangeDoctorDepartment', { DoctorId: doctorId, DepartmentId: departmentId })
}

export async function createSchedule(input: CreateScheduleInput) {
  return postAction('/api/schedule/create-schedule', input)
}

export async function changeSchedule(input: ChangeScheduleInput) {
  return postAction('/api/schedule/change-schedule', input)
}

function canReadAppointments(role: UserRole) {
  return role === 'FrontDesk' || role === 'DemoFrontDesk'
}

async function getServiceResult<T>(path: string): Promise<T> {
  const result = await request<ServiceResult<T>>(path)
  const isSuccess = result.isSuccess ?? result.IsSuccess

  if (isSuccess === false) {
    throw new Error(result.error ?? result.Error ?? 'Request failed')
  }

  return (result.data ?? result.Data ?? ([] as T)) as T
}

async function postAction(path: string, body: unknown) {
  const result = await request<ServiceResult<unknown>>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const isSuccess = result.isSuccess ?? result.IsSuccess

  if (isSuccess === false) {
    throw new Error(result.error ?? result.Error ?? 'Operation failed')
  }

  return result
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hospital-ui-v2-token')
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      payload?.error ??
      payload?.Error ??
      payload?.message ??
      payload?.Message ??
      payload?.title ??
      payload?.Title ??
      getModelStateMessage(payload?.errors ?? payload?.Errors)
    if (response.status === 403) {
      const role = localStorage.getItem('hospital-ui-v2-role')
      throw new Error(
        role?.startsWith('Demo')
          ? 'Not allowed to do that. Demo accounts are read-only.'
          : 'Not allowed to do that.',
      )
    }
    throw new Error(message ?? `Request failed with ${response.status}`)
  }

  return payload as T
}

function getModelStateMessage(errors: unknown) {
  if (!errors || typeof errors !== 'object') return null

  const values = Object.values(errors as Record<string, unknown>)
  for (const value of values) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }

  return null
}

function normalizeDepartment(value: unknown): DepartmentDto {
  const item = value as Record<string, unknown>
  return {
    id: numberValue(item.id ?? item.Id),
    name: stringValue(item.name ?? item.Name),
    isActive: booleanValue(item.isActive ?? item.IsActive),
  }
}

function normalizeDoctor(value: unknown): DoctorDto {
  const item = value as Record<string, unknown>
  return {
    doctorId: numberValue(item.doctorId ?? item.DoctorId),
    departmentId: numberValue(item.departmentId ?? item.DepartmentId ?? item.deparmentId ?? item.DeparmentId),
    userId: numberValue(item.userId ?? item.UserId),
    name: stringValue(item.name ?? item.Name),
    isActive: booleanValue(item.isActive ?? item.IsActive),
  }
}

function normalizeUser(value: unknown): UserDto {
  const item = value as Record<string, unknown>
  return {
    userId: numberValue(item.userId ?? item.UserId),
    userName: stringValue(item.userName ?? item.UserName ?? item.name ?? item.Name),
    role: stringValue(item.role ?? item.Role) as UserRole,
  }
}

function normalizeSchedule(value: unknown): ScheduleDto {
  const item = value as Record<string, unknown>
  return {
    scheduleId: numberValue(item.scheduleId ?? item.ScheduleId),
    doctorId: numberValue(item.doctorId ?? item.DoctorId),
    startTime: stringValue(item.startTime ?? item.StartTime),
    endTime: stringValue(item.endTime ?? item.EndTime),
    slotDurationMin: numberValue(item.slotDurationMin ?? item.SlotDurationMin, 30),
  }
}

function normalizeAppointment(value: unknown): AppointmentDto {
  const item = value as Record<string, unknown>
  return {
    appointmentId: numberValue(item.appointmentId ?? item.AppointmentId),
    doctorId: numberValue(item.doctorId ?? item.DoctorId),
    doctorName: stringValue(item.doctorName ?? item.DoctorName),
    patientId: numberValue(item.patientId ?? item.PatientId),
    patientName: stringValue(item.patientName ?? item.PatientName),
    patientPhoneNumber: stringValue(item.patientPhoneNumber ?? item.PatientPhoneNumber),
    appointmentTime: stringValue(item.appointmentTime ?? item.AppointmentTime ?? item.timeOfAppointment),
    status: stringValue(item.status ?? item.Status, 'Scheduled') as AppointmentStatus,
  }
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function booleanValue(value: unknown) {
  return value === true || value === 'true' || value === 'True'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Network error'
}
