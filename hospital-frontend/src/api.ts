import type * as Api from './api-schema'
import { setClinicTimeZone, toClinicIsoString } from './lib/clinicTime'
import { parseBody, tooManyRequestsMessage, unreadableResponseMessage } from './lib/http'
import { newId } from './lib/id'
import { tokenExpiry } from './lib/session'

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
export type ChangeScheduleInput = Api.ChangeScheduleDto
export type TimeOffDto = Api.TimeOffDto
export type AddTimeOffInput = Pick<Api.AddTimeOffDto, 'firstDay' | 'lastDay' | 'reason'>
export type DayOfWeek = Api.DayOfWeek
export type AffectedAppointmentDto = Api.AffectedAppointmentDto
export type PatientSummaryDto = Api.PatientSummaryDto
export type PatientsPage = Api.PatientSummaryDtoPagedResult
export type PatientDetailsDto = Api.PatientDetailsDto
export type UpdatePatientInput = Api.UpdatePatientDto
export type AuditLogEntryDto = Api.AuditLogEntryDto
export type AuditLogPage = Api.AuditLogEntryDtoPagedResult
export type AppointmentHistoryEntryDto = Api.AppointmentHistoryEntryDto

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

// localhost is for the dev server: a production build needs VITE_API_URL
// (vite.config.ts).
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
// Names the sign-in. It stays when the token is renewed, and a second sign-in
// gets a new one even when the server issues it the same token.
const sessionIdStorageKey = 'hospital-frontend-session'
const timeZoneStorageKey = 'hospital-frontend-time-zone'

// The session lives in sessionStorage: it ends when the tab closes, so the
// next person at a shared desk computer does not find someone else signed in.
// Builds before this kept it in localStorage; main.tsx removes those copies.
export function removeLegacySession() {
  for (const key of [tokenStorageKey, roleStorageKey]) localStorage.removeItem(key)
}

// The clinic's time zone arrives with each token and stays with the session,
// so a reload shows the same times (main.tsx).
export function restoreClinicTimeZone() {
  setClinicTimeZone(sessionStorage.getItem(timeZoneStorageKey))
}

function storeClinicTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) return
  sessionStorage.setItem(timeZoneStorageKey, timeZone)
  setClinicTimeZone(timeZone)
}
const requestTimeoutMs = 15000
// A free-tier host stops an idle API and can take about a minute to start it
// again, so sign-in waits longer than other requests.
const signInTimeoutMs = 90_000

export const sessionExpiredEvent = 'hospital-frontend:session-expired'

export type StoredSession = { id: string; token: string; role: UserRole }

export function getStoredSession(): StoredSession | null {
  const token = sessionStorage.getItem(tokenStorageKey)
  const role = sessionStorage.getItem(roleStorageKey) as UserRole | null
  if (!token || !role) return null
  // A session stored by a build without ids is named by its token.
  return { id: sessionStorage.getItem(sessionIdStorageKey) ?? token, token, role }
}

export function storeSession(token: string, role: UserRole, timeZone?: string | null) {
  sessionStorage.setItem(sessionIdStorageKey, newId())
  sessionStorage.setItem(tokenStorageKey, token)
  sessionStorage.setItem(roleStorageKey, role)
  storeClinicTimeZone(timeZone)
}

// A new token for the same sign-in, from a renewal or a password change.
// Nothing changes once that sign-in has ended.
function replaceToken(session: StoredSession, token: string) {
  if (getStoredSession()?.id !== session.id) return
  sessionStorage.setItem(sessionIdStorageKey, session.id)
  sessionStorage.setItem(tokenStorageKey, token)
}

export function clearSession() {
  for (const key of [sessionIdStorageKey, tokenStorageKey, roleStorageKey, timeZoneStorageKey]) {
    sessionStorage.removeItem(key)
  }
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
      storeSession(result.token, result.role, result.timeZone)
    }

    return result
  } catch (error) {
    return { isSuccess: false, token: null, role: null, error: getErrorMessage(error), timeZone: null }
  }
}

// A token lasts an hour. Once one is ten minutes old, the next request or
// click swaps it for a new one, so a session in use carries on (for up to 12
// hours after signing in, the API's limit) and one left alone for about an
// hour runs out. Demo sessions are not renewed; they end after the hour.
const renewWhenLeftMs = 50 * 60_000
// After a renewal that failed for a reason other than a refusal, such as a
// network error, the next try waits this long.
const renewRetryMs = 60_000
let renewal: Promise<void> | null = null
let renewRetryAt = 0
// Tokens the API would not renew, because their session has reached its 12
// hours or began before renewal existed. They are used until they run out.
const refusedTokens = new Set<string>()

export function renewSessionIfDue(): Promise<void> {
  const session = getStoredSession()
  const now = Date.now()
  if (!session || renewal || isDemoRole(session.role) || refusedTokens.has(session.token) || now < renewRetryAt) {
    return renewal ?? Promise.resolve()
  }
  const expires = tokenExpiry(session.token)
  if (expires === null || expires - now > renewWhenLeftMs) return Promise.resolve()

  renewal = renew(session).finally(() => {
    renewal = null
  })
  return renewal
}

async function renew(session: StoredSession) {
  try {
    const response = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
    // A 401 means the token no longer works; the next request signs out.
    if (response.status === 403) refusedTokens.add(session.token)
    if (!response.ok) {
      if (response.status !== 403 && response.status !== 401) renewRetryAt = Date.now() + renewRetryMs
      return
    }
    const result = parseBody(await response.text()).payload as LoginResult | null
    // A password change may have replaced the token meanwhile; its token wins.
    if (result?.token && getStoredSession()?.token === session.token) {
      replaceToken(session, result.token)
      storeClinicTimeZone(result.timeZone)
    }
  } catch {
    renewRetryAt = Date.now() + renewRetryMs
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
    from: toClinicIsoString(from),
    to: toClinicIsoString(to),
  })
  return getData<Api.ViewAppointmentDtoListServiceResult>(`/api/appointments?${query}`)
}

// Who booked, moved, cancelled or marked the booking, and when, oldest first.
export async function loadAppointmentHistory(appointmentId: number) {
  return getData<Api.AppointmentHistoryEntryDtoListServiceResult>(`/api/appointments/${appointmentId}/history`)
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

// To another time, and to another doctor when doctorId is given; the
// patient and the booking's history stay.
export async function moveAppointment(appointmentId: number, appointmentTime: Date, doctorId?: number) {
  return send<Api.MoveAppointmentResultDto>(
    'POST',
    `/api/appointments/${appointmentId}/move`,
    { appointmentTime: toClinicIsoString(appointmentTime), doctorId } satisfies Api.MoveAppointmentDto,
  )
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

export async function changeSchedule(scheduleId: number, input: ChangeScheduleInput, cancel?: CancelAffected) {
  return send<Api.CalendarActionResult>(
    'PUT',
    `/api/schedules/${scheduleId}`,
    { ...input, ...cancel } satisfies Api.ChangeScheduleDto,
  )
}

// Days the doctor is away, clinic dates with both ends included.
export async function addTimeOff(scheduleId: number, input: AddTimeOffInput, cancel?: CancelAffected) {
  return send<Api.CalendarActionResult>(
    'POST',
    `/api/schedules/${scheduleId}/time-off`,
    { ...input, ...cancel } satisfies Api.AddTimeOffDto,
  )
}

export async function removeTimeOff(scheduleId: number, timeOffId: number) {
  return send<Api.CalendarActionResult>('DELETE', `/api/schedules/${scheduleId}/time-off/${timeOffId}`)
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
  const query = new URLSearchParams({ from: toClinicIsoString(from), to: toClinicIsoString(to) })
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
  const result = await send<Api.ChangePasswordResultDto>(
    'POST',
    '/api/auth/change-password',
    { currentPassword, newPassword } satisfies Api.ChangePasswordDto,
  )
  if (result.token && session) replaceToken(session, result.token)
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

async function send<R extends Outcome>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<R> {
  const result = await request<R>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
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
  // Using the app keeps the session going; nothing waits for the renewal.
  void renewSessionIfDue()

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
    if (response.status === 401 && session) {
      // A response from a previous account can arrive after a new sign-in,
      // and one sent with a token that has since been replaced (renewed, or
      // by a password change, which revokes the old one) after the new one
      // is in use. Only the sign-in and token the request used may expire.
      const current = getStoredSession()
      if (current?.id === session.id && current.token === session.token) {
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
