import { parseBody, tooManyRequestsMessage, unreadableResponseMessage } from './lib/http'
import { toLocalIsoString } from './lib/time'

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

export type UsersPage = {
  items: UserDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const usersPageSize = 50

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

const tokenStorageKey = 'hospital-frontend-token'
const roleStorageKey = 'hospital-frontend-role'
const requestTimeoutMs = 15000

export const sessionExpiredEvent = 'hospital-frontend:session-expired'

export function getStoredSession() {
  const token = localStorage.getItem(tokenStorageKey)
  const role = localStorage.getItem(roleStorageKey) as UserRole | null
  return token && role ? { token, role } : null
}

export function storeSession(token: string, role: UserRole) {
  localStorage.setItem(tokenStorageKey, token)
  localStorage.setItem(roleStorageKey, role)
}

export function clearSession() {
  localStorage.removeItem(tokenStorageKey)
  localStorage.removeItem(roleStorageKey)
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

export async function demoLogin(role: 'DemoAdmin' | 'DemoFrontDesk'): Promise<LoginResult> {
  try {
    const result = await request<LoginResult>('/api/Auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    })

    if (result.isSuccess && result.token && result.role) {
      storeSession(result.token, result.role)
    }

    return result
  } catch (error) {
    return { isSuccess: false, error: getErrorMessage(error) }
  }
}

// Users and appointments are loaded on their own, a page or a week at a time.
export async function loadHospitalData() {
  const [departments, doctors, schedules] = await Promise.all([
    getServiceResult<unknown[]>('/api/Department/ViewDepartment').then((items) => items.map(normalizeDepartment)),
    getServiceResult<unknown[]>('/api/Users/ListDoctors').then((items) => items.map(normalizeDoctor)),
    getServiceResult<unknown[]>('/api/schedule/list-schedule').then((items) => items.map(normalizeSchedule)),
  ])

  return { departments, doctors, schedules }
}

// One doctor's appointments that start at or after `from` and before `to`.
export async function loadAppointments(doctorId: number, from: Date, to: Date) {
  const query = new URLSearchParams({
    doctorId: String(doctorId),
    from: toLocalIsoString(from),
    to: toLocalIsoString(to),
  })
  const items = await getServiceResult<unknown[]>(`/api/Appointments/ListAppointments?${query}`)
  return items.map(normalizeAppointment)
}

// search matches part of a username or role; the API caps it at 50 characters.
export async function loadUsers(search: string, page: number): Promise<UsersPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(usersPageSize) })
  const term = search.trim().slice(0, 50)
  if (term) query.set('search', term)
  return normalizeUsersPage(await getServiceResult<unknown>(`/api/Users/ListUsers?${query}`))
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

export function canListUsers(role: UserRole) {
  return role === 'Admin'
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
  const token = localStorage.getItem(tokenStorageKey)

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('Request timed out. Please try again.')
    }
    throw error
  }

  const text = await response.text()
  const { payload, isJson } = parseBody(text)

  if (!response.ok) {
    const message =
      payload?.error ??
      payload?.Error ??
      payload?.message ??
      payload?.Message ??
      payload?.title ??
      payload?.Title ??
      getModelStateMessage(payload?.errors ?? payload?.Errors)
    if (response.status === 401 && token) {
      clearSession()
      window.dispatchEvent(new Event(sessionExpiredEvent))
      throw new Error('Your session has expired. Please sign in again.')
    }
    if (response.status === 403) {
      const role = localStorage.getItem(roleStorageKey)
      throw new Error(
        role?.startsWith('Demo')
          ? 'Not allowed to do that. Demo accounts are read-only.'
          : 'Not allowed to do that.',
      )
    }
    if (response.status === 429) {
      throw new Error(tooManyRequestsMessage(response.headers.get('Retry-After')))
    }
    if (!isJson) {
      throw new Error(unreadableResponseMessage(response.status))
    }
    throw new Error(message ?? `Request failed with ${response.status}`)
  }

  if (!isJson) {
    throw new Error(unreadableResponseMessage(response.status))
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

function normalizeUsersPage(value: unknown): UsersPage {
  const page = (value ?? {}) as Record<string, unknown>
  const items = page.items ?? page.Items
  return {
    items: Array.isArray(items) ? items.map(normalizeUser) : [],
    totalCount: numberValue(page.totalCount ?? page.TotalCount),
    page: numberValue(page.page ?? page.Page, 1),
    pageSize: numberValue(page.pageSize ?? page.PageSize, usersPageSize),
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
