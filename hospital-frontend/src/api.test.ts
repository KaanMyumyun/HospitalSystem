import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AffectedBookingsError,
  changeOwnPassword,
  changeSchedule,
  changeUserRole,
  createAppointment,
  getStoredSession,
  loadPatient,
  PossiblePatientMatchError,
  removeLegacySession,
  sessionExpiredEvent,
  storeSession,
  wakeApi,
} from './api'

const booking = {
  doctorId: 1,
  patientName: 'Child Ivanov',
  phoneNumber: '0888 111 222',
  dateOfBirth: '2016-08-20',
  appointmentTime: '2027-03-01T09:20:00+03:00',
}

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// The tests run in Node, which has no web storage.
let stored: Record<string, string> = {}
let legacy: Record<string, string> = {}

function storage(values: () => Record<string, string>) {
  return {
    getItem: (key: string) => values()[key] ?? null,
    setItem: (key: string, value: string) => {
      values()[key] = value
    },
    removeItem: (key: string) => {
      delete values()[key]
    },
  }
}

beforeEach(() => {
  stored = {}
  legacy = {}
  vi.stubGlobal('sessionStorage', storage(() => stored))
  vi.stubGlobal('localStorage', storage(() => legacy))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createAppointment', () => {
  it('reports possible patient matches', async () => {
    respondWith(409, {
      isSuccess: false,
      error: 'These details partly match a patient on file.',
      possibleMatches: [{ patientId: 7, name: 'Maria Ivanova', dateOfBirth: '1985-04-12', phoneNumber: '0888111222' }],
    })

    const error = await createAppointment(booking).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(PossiblePatientMatchError)
    expect((error as PossiblePatientMatchError).matches).toEqual([
      { patientId: 7, name: 'Maria Ivanova', dateOfBirth: '1985-04-12', phoneNumber: '0888111222' },
    ])
  })

  it('reports a booking conflict as a plain error', async () => {
    respondWith(409, { isSuccess: false, error: 'Doctor already booked for that time slot', possibleMatches: null })

    const error = await createAppointment(booking).catch((caught: unknown) => caught)

    expect(error).not.toBeInstanceOf(PossiblePatientMatchError)
    expect((error as Error).message).toBe('Doctor already booked for that time slot')
  })
})

describe('wakeApi', () => {
  it('pings the readiness check without waiting for an answer', () => {
    const fetchMock = respondWith(200, {})

    wakeApi()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5272/health/ready', {
      mode: 'no-cors',
      cache: 'no-store',
    })
  })
})

describe('changeSchedule', () => {
  it('sends the browser time zone, so the API reads bookings as local times', async () => {
    const fetchMock = respondWith(200, { isSuccess: true, error: null, affectedAppointmentCount: 0, affectedAppointments: null })

    await changeSchedule(1, { startHour: 9, endHour: 17, slotDurationMin: 30 })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/schedules/1')
    expect(init?.method).toBe('PUT')
    const body = JSON.parse(String(init?.body))
    expect(body.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('reports bookings the change would strand', async () => {
    respondWith(409, {
      isSuccess: false,
      error: 'This change affects 3 future bookings.',
      affectedAppointmentCount: 3,
      affectedAppointments: [{ appointmentId: 10, appointmentTime: '2030-06-03T06:00:00Z', doctorName: 'drhouse', patientInitials: 'MI' }],
    })

    const error = await changeSchedule(1, { startHour: 12, endHour: 17, slotDurationMin: 30 }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(AffectedBookingsError)
    expect((error as AffectedBookingsError).count).toBe(3)
    expect((error as AffectedBookingsError).bookings.map((affected) => affected.patientInitials)).toEqual(['MI'])
  })
})

describe('changeOwnPassword', () => {
  it('keeps the session going with the token that comes back', async () => {
    stored['hospital-frontend-token'] = 'old-token'
    stored['hospital-frontend-role'] = 'FrontDesk'
    respondWith(200, { isSuccess: true, error: null, token: 'new-token' })

    await changeOwnPassword('old-password', 'new-password')

    expect(stored['hospital-frontend-token']).toBe('new-token')
    expect(stored['hospital-frontend-role']).toBe('FrontDesk')
  })

  it('does not replace a newer session when an old password change finishes', async () => {
    storeSession('old-token', 'FrontDesk')
    let finishRequest!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve })))

    const pending = changeOwnPassword('old-password', 'new-password')
    storeSession('new-account-token', 'Admin')
    finishRequest(new Response(JSON.stringify({ isSuccess: true, error: null, token: 'old-account-new-token' })))
    await pending

    expect(getStoredSession()).toEqual({ token: 'new-account-token', role: 'Admin' })
  })
})

describe('changeUserRole', () => {
  it('names the user in the path and sends the new doctor\'s department', async () => {
    stored['hospital-frontend-token'] = 'admin-token'
    stored['hospital-frontend-role'] = 'Admin'
    const fetchMock = respondWith(200, { isSuccess: true, error: null, affectedAppointmentCount: 0, affectedAppointments: null })

    await changeUserRole(5, 'Doctor', 3)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/users/5/role')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ newRole: 'Doctor', departmentId: 3 })
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-token')
  })
})

describe('removeLegacySession', () => {
  it('removes a session that an older build left in localStorage', () => {
    legacy['hospital-frontend-token'] = 'old-token'
    legacy['hospital-frontend-role'] = 'Admin'
    legacy['hospital-frontend-activity'] = '[]'

    removeLegacySession()

    expect(legacy).toEqual({ 'hospital-frontend-activity': '[]' })
  })
})

describe('session expiry', () => {
  it('clears the session when its own request returns 401', async () => {
    storeSession('old-token', 'FrontDesk')
    const events = new EventTarget()
    const expired = vi.fn()
    events.addEventListener(sessionExpiredEvent, expired)
    vi.stubGlobal('window', events)
    respondWith(401, { error: 'Unauthorized' })

    await expect(loadPatient(1)).rejects.toThrow('Your session has expired')

    expect(getStoredSession()).toBeNull()
    expect(expired).toHaveBeenCalledOnce()
  })

  it('leaves a newer session signed in when an old request returns 401', async () => {
    storeSession('old-token', 'FrontDesk')
    const events = new EventTarget()
    const expired = vi.fn()
    events.addEventListener(sessionExpiredEvent, expired)
    vi.stubGlobal('window', events)
    let finishRequest!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve })))

    const pending = loadPatient(1)
    storeSession('new-token', 'Admin')
    finishRequest(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    await expect(pending).rejects.toThrow('Your session has expired')

    expect(getStoredSession()).toEqual({ token: 'new-token', role: 'Admin' })
    expect(expired).not.toHaveBeenCalled()
  })

  it('recognizes a new sign-in even when the server issued the same token', async () => {
    storeSession('same-token', 'FrontDesk')
    const events = new EventTarget()
    const expired = vi.fn()
    events.addEventListener(sessionExpiredEvent, expired)
    vi.stubGlobal('window', events)
    let finishRequest!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve })))

    const pending = loadPatient(1)
    storeSession('same-token', 'FrontDesk')
    finishRequest(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    await expect(pending).rejects.toThrow('Your session has expired')

    expect(getStoredSession()).toEqual({ token: 'same-token', role: 'FrontDesk' })
    expect(expired).not.toHaveBeenCalled()
  })
})
