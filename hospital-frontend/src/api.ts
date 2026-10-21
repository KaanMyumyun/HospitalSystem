import type * as Api from './api-schema'
import { parseBody, tooManyRequestsMessage, unreadableResponseMessage } from './lib/http'
import { toLocalIsoString } from './lib/time'

// Requests and responses are typed by src/api-schema.ts, which is generated
// from the API's OpenAPI document (npm run generate:api).
export type UserRole = Api.UserRole
export type LoginResult = Api.LoginResultDto
export type DepartmentDto = Api.ViewDepartmentDto
export type DoctorDto = Api.DoctorDisplayDto
export type UserDto = Api.UserDisplayDto
export type UsersPage = Api.UserDisplayDtoPagedResult
export type ScheduleDto = Api.ViewSchedule
export type AppointmentStatus = Api.AppointmentStatus
export type AppointmentDto = Api.ViewAppointmentDto
// patientId or createNewPatient is set when booking again after the API
// listed possible matches.
export type CreateAppointmentInput = Api.CreateAppointmentDto
export type PatientMatchDto = Api.PatientMatchDto
export type CancelAppointmentInput = Api.CancelAppointmentDto
export type CreateScheduleInput = Api.CreateSchedule
// The time zone is added by changeSchedule.
export type ChangeScheduleInput = Omit<Api.ChangeScheduleDto, 'timeZone'>
export type DayOfWeek = Api.DayOfWeek
export type AffectedAppointmentDto = Api.AffectedAppointmentDto
export type PatientSummaryDto = Api.PatientSummaryDto
export type PatientsPage = Api.PatientSummaryDtoPagedResult
export type PatientDetailsDto = Api.PatientDetailsDto
export type UpdatePatientInput = Api.UpdatePatientDto
export type AuditLogEntryDto = Api.AuditLogEntryDto
export type AuditLogPage = Api.AuditLogEntryDtoPagedResult

// Sent with a change the API refused because it strands future bookings.
export type CancelAffected = { cancelAffectedAppointments: true; cancellationReason: string }

export const usersPageSize = 50
export const pageSize = 50

// The booking's patient details partly match patients on file. The desk
// books for one of them or registers a new patient.
export class PossiblePatientMatchError extends Error {
  readonly matches: PatientMatchDto[]

  constructor(message: string, matches: PatientMatchDto[]) {
    super(message)
    this.name = 'PossiblePatientMatchError'
    this.matches = matches
  }
}

// A schedule, status or role change would strand future bookings. The admin
// can send it again with a reason, which cancels them.
export class AffectedBookingsError extends Error {
  readonly count: number
  readonly bookings: AffectedAppointmentDto[]

  constructor(message: string, count: number, bookings: AffectedAppointmentDto[]) {
    super(message)
    this.name = 'AffectedBookingsError'
    this.count = count
    this.bookings = bookings
  }
}

// Every API response carries these; list responses add data.
type Outcome = { isSuccess: boolean; error: string | null }
type DataOutcome = Outcome & { data: unknown }

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
// A free-tier host stops an idle API and can take about a minute to start it
// again, so sign-in waits longer than other requests.
const signInTimeoutMs = 90_000

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

// Starts an idle API while the visitor is still on the sign-in page; nothing
// waits for the answer. Skipped when the API shares the app's origin.
export function wakeApi() {
  if (!API_ORIGIN) return
  void fetch(`${API_ORIGIN}/health/ready`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined)
}

export async function login(name: string, password: string): Promise<LoginResult> {
  return signIn('/api/Auth/login', { name, password } satisfies Api.LoginDto)
}

export async function demoLogin(role: 'DemoAdmin' | 'DemoFrontDesk'): Promise<LoginResult> {
  return signIn('/api/Auth/demo-login', { role } satisfies Api.DemoLoginDto)
}

async function signIn(path: string, body: Api.LoginDto | Api.DemoLoginDto): Promise<LoginResult> {
  try {
    const result = await request<LoginResult>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(signInTimeoutMs),
    })

    if (result.isSuccess && result.token && result.role) {
      storeSession(result.token, result.role)
    }

    return result
  } catch (error) {
    return { isSuccess: false, token: null, role: null, error: getErrorMessage(error) }
  }
}

// Users and appointments are loaded on their own, a page or a week at a time.
export async function loadHospitalData() {
  const [departments, doctors, schedules] = await Promise.all([
    getData<Api.ViewDepartmentDtoListServiceResult>('/api/Department/ViewDepartment'),
    getData<Api.DoctorDisplayDtoListServiceResult>('/api/Users/ListDoctors'),
    getData<Api.ViewScheduleListServiceResult>('/api/schedule/list-schedule'),
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
  return getData<Api.ViewAppointmentDtoListServiceResult>(`/api/Appointments/ListAppointments?${query}`)
}

// search matches part of a username or role; the API caps it at 50 characters.
export async function loadUsers(search: string, page: number): Promise<UsersPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(usersPageSize) })
  const term = search.trim().slice(0, 50)
  if (term) query.set('search', term)
  return getData<Api.UserDisplayDtoPagedResultServiceResult>(`/api/Users/ListUsers?${query}`)
}

export async function createAppointment(input: CreateAppointmentInput) {
  return post<Api.CreateAppointmentResultDto>('/api/Appointments/CreateAppointment', input)
}

export async function cancelAppointment(input: CancelAppointmentInput) {
  return post<Api.CancelAppointmentResultDto>('/api/Appointments/CancelAppointment', input)
}

export async function createDepartment(name: string) {
  return post<Api.DepartmentActionResultDto>('/api/Department/CreateDepartment', { name } satisfies Api.CreateDepartmentDto)
}

export async function changeDepartmentStatus(departmentId: number, isActive: boolean, cancel?: CancelAffected) {
  return post<Api.DepartmentActionResultDto>(
    '/api/Department/ChangeDepartmentStatus',
    { departmentId, isActive, ...cancel } satisfies Api.ChangeDepartmentStatusDto,
  )
}

export async function createUser(name: string, password: string) {
  return post<Api.CreateUserResultDto>('/api/Auth/CreateUser', { name, password } satisfies Api.CreateUserDto)
}

export async function changeUserRole(userId: number, newRole: UserRole, cancel?: CancelAffected) {
  return post<Api.ChangeRoleResultDto>(
    '/api/Users/change-role',
    { userId, newRole, ...cancel } satisfies Api.ChangeRoleDto,
  )
}

export async function resetPassword(userId: number, newPassword: string) {
  return post<Api.ResetPasswordResultDto>(
    '/api/Users/reset-password',
    { userId, newPassword } satisfies Api.ResetPasswordDto,
  )
}

export async function changeDoctorStatus(doctor: DoctorDto, isActive: boolean, cancel?: CancelAffected) {
  return post<Api.ChangeDoctorsStatusResult>(
    '/api/Users/change-doctor-status',
    { doctorId: doctor.doctorId, isActive, ...cancel } satisfies Api.ChangeDoctorStatusDto,
  )
}

export async function changeDoctorDepartment(doctorId: number, departmentId: number) {
  return post<Api.DepartmentActionResultDto>(
    '/api/Department/ChangeDoctorDepartment',
    { doctorId, departmentId } satisfies Api.ChangeDoctorDepartmentDto,
  )
}

export async function createSchedule(input: CreateScheduleInput) {
  return post<Api.CalendarActionResult>('/api/schedule/create-schedule', input)
}

// The API checks future bookings against the new hours as wall-clock times
// in this browser's time zone.
export async function changeSchedule(input: ChangeScheduleInput, cancel?: CancelAffected) {
  return post<Api.CalendarActionResult>(
    '/api/schedule/change-schedule',
    { ...input, ...cancel, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } satisfies Api.ChangeScheduleDto,
  )
}

export async function changeAppointmentStatus(appointmentId: number, status: 'Completed' | 'NoShow') {
  return post<Api.AppointmentStatusResultDto>(
    '/api/Appointments/ChangeAppointmentStatus',
    { appointmentId, status } satisfies Api.ChangeAppointmentStatusDto,
  )
}

// The signed-in doctor's appointments that start at or after `from` and before `to`.
export async function loadMyAppointments(from: Date, to: Date) {
  const query = new URLSearchParams({ from: toLocalIsoString(from), to: toLocalIsoString(to) })
  return getData<Api.ViewAppointmentDtoListServiceResult>(`/api/Appointments/MyAppointments?${query}`)
}

// search matches part of a name, or at least three digits of a phone number.
export async function loadPatients(search: string, page: number): Promise<PatientsPage> {
  return getData<Api.PatientSummaryDtoPagedResultServiceResult>(`/api/Patients/ListPatients?${pageQuery(search, page)}`)
}

export async function loadPatient(patientId: number) {
  return getData<Api.PatientDetailsDtoServiceResult>(`/api/Patients/${patientId}`)
}

export async function updatePatient(input: UpdatePatientInput) {
  return post<Api.PatientActionResultDto>('/api/Patients/UpdatePatient', input)
}

// search matches part of an action or of the details.
export async function loadAuditLogs(search: string, page: number): Promise<AuditLogPage> {
  return getData<Api.AuditLogEntryDtoPagedResultServiceResult>(`/api/AuditLogs/ListAuditLogs?${pageQuery(search, page)}`)
}

// Changing the password signs out every other session; this one carries on
// with the token that comes back.
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const result = await post<Api.ChangePasswordResultDto>(
    '/api/Auth/change-password',
    { currentPassword, newPassword } satisfies Api.ChangePasswordDto,
  )
  const role = getStoredSession()?.role
  if (result.token && role) storeSession(result.token, role)
  return result
}

// The API caps search terms at 50 characters.
function pageQuery(search: string, page: number) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const term = search.trim().slice(0, 50)
  if (term) query.set('search', term)
  return query
}

export function canListUsers(role: UserRole) {
  return role === 'Admin'
}

// The data of a successful list request. Failures arrive as error statuses,
// which request() turns into errors.
async function getData<R extends DataOutcome>(path: string): Promise<NonNullable<R['data']>> {
  const result = await request<R>(path)
  if (!result.isSuccess || result.data == null) {
    throw new Error(result.error ?? 'Request failed')
  }
  return result.data
}

async function post<R extends Outcome>(path: string, body: unknown): Promise<R> {
  const result = await request<R>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!result.isSuccess) {
    throw new Error(result.error ?? 'Operation failed')
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
    const possibleMatches: unknown = payload?.possibleMatches
    if (response.status === 409 && Array.isArray(possibleMatches) && possibleMatches.length > 0) {
      throw new PossiblePatientMatchError(
        message ?? 'These details partly match a patient on file.',
        possibleMatches as PatientMatchDto[],
      )
    }
    const affected: unknown = payload?.affectedAppointments
    if (response.status === 409 && Array.isArray(affected) && affected.length > 0) {
      throw new AffectedBookingsError(
        message ?? 'This change affects future bookings.',
        typeof payload?.affectedAppointmentCount === 'number' ? payload.affectedAppointmentCount : affected.length,
        affected as AffectedAppointmentDto[],
      )
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Network error'
}
