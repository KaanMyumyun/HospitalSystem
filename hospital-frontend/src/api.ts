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
// A second login can receive the same JWT within one clock second. The local
// revision still distinguishes its requests from the previous session's.
let sessionRevision = 0

// The session lives in sessionStorage: it ends when the tab closes, so the
// next person at a shared desk computer does not find someone else signed in.
// Builds before this kept it in localStorage; main.tsx removes those copies.
export function removeLegacySession() {
  for (const key of [tokenStorageKey, roleStorageKey]) localStorage.removeItem(key)
}
const requestTimeoutMs = 15000
// A free-tier host stops an idle API and can take about a minute to start it
// again, so sign-in waits longer than other requests.
const signInTimeoutMs = 90_000

export const sessionExpiredEvent = 'hospital-frontend:session-expired'

export function getStoredSession() {
  const token = sessionStorage.getItem(tokenStorageKey)
  const role = sessionStorage.getItem(roleStorageKey) as UserRole | null
  return token && role ? { token, role } : null
}

export function storeSession(token: string, role: UserRole) {
  sessionRevision++
  sessionStorage.setItem(tokenStorageKey, token)
  sessionStorage.setItem(roleStorageKey, role)
}

export function clearSession() {
  sessionRevision++
  sessionStorage.removeItem(tokenStorageKey)
  sessionStorage.removeItem(roleStorageKey)
}

export function isDemoRole(role: UserRole | null | undefined) {
  return role === 'DemoAdmin' || role === 'DemoFrontDesk'
}

// Starts an idle API while the visitor is still on the sign-in page; nothing
// waits for the answer. Skipped when the API shares the app's origin.
export function wakeApi() {
  if (!API_ORIGIN) return
  void fetch(`${API_ORIGIN}/health/ready`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined)
}

export async function login(name: string, password: string): Promise<LoginResult> {
  return signIn('/api/auth/login', { name, password } satisfies Api.LoginDto)
}

export async function demoLogin(role: 'DemoAdmin' | 'DemoFrontDesk'): Promise<LoginResult> {
  return signIn('/api/auth/demo-login', { role } satisfies Api.DemoLoginDto)
}

async function signIn(path: string, body: Api.LoginDto | Api.DemoLoginDto): Promise<LoginResult> {
  try {
    const result = await request<LoginResult>(path, { method: 'POST', body: JSON.stringify(body) }, signInTimeoutMs)

    if (result.isSuccess && result.token && result.role) {
      storeSession(result.token, result.role)
    }

    return result
  } catch (error) {
    return { isSuccess: false, token: null, role: null, error: getErrorMessage(error) }
  }
}

// Users and appointments are loaded on their own, a page or a week at a time.
// Aborting the signal drops a load that a newer one has replaced.
export async function loadHospitalData(signal?: AbortSignal) {
  const [departments, doctors, schedules] = await Promise.all([
    getData<Api.ViewDepartmentDtoListServiceResult>('/api/departments', signal),
    getData<Api.DoctorDisplayDtoListServiceResult>('/api/doctors', signal),
    getData<Api.ViewScheduleListServiceResult>('/api/schedules', signal),
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
  return getData<Api.ViewAppointmentDtoListServiceResult>(`/api/appointments?${query}`)
}

// search matches part of a username or role; the API caps it at 50 characters.
export async function loadUsers(search: string, page: number): Promise<UsersPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(usersPageSize) })
  const term = search.trim().slice(0, 50)
  if (term) query.set('search', term)
  return getData<Api.UserDisplayDtoPagedResultServiceResult>(`/api/users?${query}`)
}

export async function createAppointment(input: CreateAppointmentInput) {
  return send<Api.CreateAppointmentResultDto>('POST', '/api/appointments', input)
}

export async function cancelAppointment(appointmentId: number, reason: string) {
  return send<Api.CancelAppointmentResultDto>(
    'POST',
    `/api/appointments/${appointmentId}/cancel`,
    { reason } satisfies Api.CancelAppointmentDto,
  )
}

export async function createDepartment(name: string) {
  return send<Api.DepartmentActionResultDto>('POST', '/api/departments', { name } satisfies Api.CreateDepartmentDto)
}

export async function changeDepartmentStatus(departmentId: number, isActive: boolean, cancel?: CancelAffected) {
  return send<Api.DepartmentActionResultDto>(
    'PATCH',
    `/api/departments/${departmentId}/status`,
    { isActive, ...cancel } satisfies Api.ChangeDepartmentStatusDto,
  )
}

export async function createUser(name: string, password: string) {
  return send<Api.CreateUserResultDto>('POST', '/api/users', { name, password } satisfies Api.CreateUserDto)
}

// departmentId is where a user who has never been a doctor will work.
export async function changeUserRole(userId: number, newRole: UserRole, departmentId?: number, cancel?: CancelAffected) {
  return send<Api.ChangeRoleResultDto>(
    'PATCH',
    `/api/users/${userId}/role`,
    { newRole, departmentId, ...cancel } satisfies Api.ChangeRoleDto,
  )
}

export async function resetPassword(userId: number, newPassword: string) {
  return send<Api.ResetPasswordResultDto>(
    'PUT',
    `/api/users/${userId}/password`,
    { newPassword } satisfies Api.ResetPasswordDto,
  )
}

export async function changeDoctorStatus(doctor: DoctorDto, isActive: boolean, cancel?: CancelAffected) {
  return send<Api.ChangeDoctorsStatusResult>(
    'PATCH',
    `/api/doctors/${doctor.doctorId}/status`,
    { isActive, ...cancel } satisfies Api.ChangeDoctorStatusDto,
  )
}

export async function changeDoctorDepartment(doctorId: number, departmentId: number) {
  return send<Api.DepartmentActionResultDto>(
    'PATCH',
    `/api/doctors/${doctorId}/department`,
    { departmentId } satisfies Api.ChangeDoctorDepartmentDto,
  )
}

export async function createSchedule(input: CreateScheduleInput) {
  return send<Api.CalendarActionResult>('POST', '/api/schedules', input)
}

// The API checks future bookings against the new hours as wall-clock times
// in this browser's time zone.
export async function changeSchedule(scheduleId: number, input: ChangeScheduleInput, cancel?: CancelAffected) {
  return send<Api.CalendarActionResult>(
    'PUT',
    `/api/schedules/${scheduleId}`,
    { ...input, ...cancel, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } satisfies Api.ChangeScheduleDto,
  )
}

export async function changeAppointmentStatus(appointmentId: number, status: 'Completed' | 'NoShow') {
  return send<Api.AppointmentStatusResultDto>(
    'PATCH',
    `/api/appointments/${appointmentId}/status`,
    { status } satisfies Api.ChangeAppointmentStatusDto,
  )
}

// The signed-in doctor's appointments that start at or after `from` and before `to`.
export async function loadMyAppointments(from: Date, to: Date) {
  const query = new URLSearchParams({ from: toLocalIsoString(from), to: toLocalIsoString(to) })
  return getData<Api.ViewAppointmentDtoListServiceResult>(`/api/appointments/mine?${query}`)
}

// search matches part of a name, or at least three digits of a phone number.
export async function loadPatients(search: string, page: number): Promise<PatientsPage> {
  return getData<Api.PatientSummaryDtoPagedResultServiceResult>(`/api/patients?${pageQuery(search, page)}`)
}

export async function loadPatient(patientId: number) {
  return getData<Api.PatientDetailsDtoServiceResult>(`/api/patients/${patientId}`)
}

export async function updatePatient(patientId: number, input: UpdatePatientInput) {
  return send<Api.PatientActionResultDto>('PUT', `/api/patients/${patientId}`, input)
}

// search matches part of an action or of the details.
export async function loadAuditLogs(search: string, page: number): Promise<AuditLogPage> {
  return getData<Api.AuditLogEntryDtoPagedResultServiceResult>(`/api/audit-logs?${pageQuery(search, page)}`)
}

// Changing the password signs out every other session; this one carries on
// with the token that comes back.
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = getStoredSession()
  const revision = sessionRevision
  const result = await send<Api.ChangePasswordResultDto>(
    'POST',
    '/api/auth/change-password',
    { currentPassword, newPassword } satisfies Api.ChangePasswordDto,
  )
  if (result.token && session && sessionRevision === revision && getStoredSession()?.token === session.token) {
    storeSession(result.token, session.role)
  }
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
async function getData<R extends DataOutcome>(path: string, signal?: AbortSignal): Promise<NonNullable<R['data']>> {
  const result = await request<R>(path, { signal })
  if (!result.isSuccess || result.data == null) {
    throw new Error(result.error ?? 'Request failed')
  }
  return result.data
}

async function send<R extends Outcome>(method: 'POST' | 'PUT' | 'PATCH', path: string, body: unknown): Promise<R> {
  const result = await request<R>(path, {
    method,
    body: JSON.stringify(body),
  })

  if (!result.isSuccess) {
    throw new Error(result.error ?? 'Operation failed')
  }

  return result
}

// A caller's signal cancels a request that is no longer wanted; the timeout
// gives up on one that takes too long.
async function request<T>(path: string, init: RequestInit = {}, timeoutMs = requestTimeoutMs): Promise<T> {
  const session = getStoredSession()
  const token = session?.token
  const revision = sessionRevision

  let response: Response
  try {
    const timeout = AbortSignal.timeout(timeoutMs)
    response = await fetch(apiUrl(path), {
      ...init,
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    // A request the caller cancelled stays an AbortError, which callers ignore.
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('Request timed out. Please try again.', { cause: error })
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
      // A response from a previous account can arrive after a new sign-in.
      // Only that request's own session may be expired by its 401.
      if (sessionRevision === revision && getStoredSession()?.token === token) {
        clearSession()
        window.dispatchEvent(new Event(sessionExpiredEvent))
      }
      throw new Error('Your session has expired. Please sign in again.')
    }
    if (response.status === 403) {
      throw new Error(
        isDemoRole(session?.role)
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
