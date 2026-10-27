import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AffectedBookingsError,
  changeOwnPassword,
  changeSchedule,
  changeUserRole,
  clearSession,
  createAppointment,
  getStoredSession,
  loadPatient,
  moveAppointment,
  PossiblePatientMatchError,
  removeLegacySession,
  removeTimeOff,
  renewSessionIfDue,
  restoreClinicTimeZone,
  sessionExpiredEvent,
  storeSession,
  wakeApi,
} from './api'
import { clinicTimeZone, setClinicTimeZone } from './lib/clinicTime'

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
  vi.useRealTimers()
  setClinicTimeZone('UTC')
})

// A token that runs out in minutesLeft minutes; the signature does not matter
// here. tag keeps tokens apart between tests.
function tokenExpiringIn(minutesLeft: number, tag: string) {
  const base64url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const claims = { exp: Math.floor(Date.now() / 1000) + minutesLeft * 60, tag }
  return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify(claims))}.signature`
}

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
  it('sends the hours and break, and no time zone: the API reads them as clinic times', async () => {
    const fetchMock = respondWith(200, { isSuccess: true, error: null, affectedAppointmentCount: 0, affectedAppointments: null })

    await changeSchedule(1, { startHour: 9, endHour: 17, slotDurationMin: 30, breakStartMinute: 720, breakEndMinute: 780 })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/schedules/1')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({
      startHour: 9,
      endHour: 17,
      slotDurationMin: 30,
      breakStartMinute: 720,
      breakEndMinute: 780,
    })
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

describe('moveAppointment', () => {
  it("sends the new time as the clinic's, with its offset", async () => {
    setClinicTimeZone('Europe/Sofia')
    const fetchMock = respondWith(200, { isSuccess: true, error: null })

    await moveAppointment(12, new Date('2026-11-02T08:30:00Z'), 4)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/appointments/12/move')
    expect(JSON.parse(String(init?.body))).toEqual({ appointmentTime: '2026-11-02T10:30:00+02:00', doctorId: 4 })
  })
})

describe('removeTimeOff', () => {
  it('sends a DELETE without a body', async () => {
    const fetchMock = respondWith(200, { isSuccess: true, error: null, affectedAppointmentCount: 0, affectedAppointments: null })

    await removeTimeOff(3, 8)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/schedules/3/time-off/8')
    expect(init?.method).toBe('DELETE')
    expect(init?.body).toBeUndefined()
  })
})

describe('clinic time zone', () => {
  it('comes with the session and back after a reload', () => {
    storeSession('token', 'FrontDesk', 'Europe/Sofia')
    setClinicTimeZone('UTC')

    restoreClinicTimeZone()

    expect(clinicTimeZone()).toBe('Europe/Sofia')
  })

  it('goes with the session', () => {
    storeSession('token', 'FrontDesk', 'Europe/Sofia')
    clearSession()

    expect(stored).toEqual({})
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

    expect(getStoredSession()).toMatchObject({ token: 'new-account-token', role: 'Admin' })
  })

  it('keeps the session id, so App carries on with it', async () => {
    storeSession('old-token', 'FrontDesk')
    const { id } = getStoredSession()!
    respondWith(200, { isSuccess: true, error: null, token: 'new-token' })

    await changeOwnPassword('old-password', 'new-password')

    expect(getStoredSession()).toEqual({ id, token: 'new-token', role: 'FrontDesk' })
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

    expect(getStoredSession()).toMatchObject({ token: 'new-token', role: 'Admin' })
    expect(expired).not.toHaveBeenCalled()
  })

  it('keeps the session when a request sent before a password change returns 401', async () => {
    storeSession('old-token', 'FrontDesk')
    const events = new EventTarget()
    const expired = vi.fn()
    events.addEventListener(sessionExpiredEvent, expired)
    vi.stubGlobal('window', events)
    let finishRequest!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve })))

    const pending = loadPatient(1)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ isSuccess: true, error: null, token: 'new-token' }))))
    await changeOwnPassword('old-password', 'new-password')
    finishRequest(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    await expect(pending).rejects.toThrow('Your session has expired')

    expect(getStoredSession()).toMatchObject({ token: 'new-token', role: 'FrontDesk' })
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

    expect(getStoredSession()).toMatchObject({ token: 'same-token', role: 'FrontDesk' })
    expect(expired).not.toHaveBeenCalled()
  })
})

describe('renewSessionIfDue', () => {
  const renewed = (token: string) => ({ isSuccess: true, token, role: 'FrontDesk', error: null, timeZone: 'Europe/Sofia' })

  it('swaps a token over ten minutes old for a new one, in the same session', async () => {
    const token = tokenExpiringIn(45, 'swap')
    storeSession(token, 'FrontDesk')
    const { id } = getStoredSession()!
    const fetchMock = respondWith(200, renewed('renewed-token'))

    await renewSessionIfDue()

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:5272/api/auth/refresh')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${token}`)
    expect(getStoredSession()).toEqual({ id, token: 'renewed-token', role: 'FrontDesk' })
    expect(clinicTimeZone()).toBe('Europe/Sofia')
  })

  it('leaves a new token alone', async () => {
    storeSession(tokenExpiringIn(55, 'fresh'), 'FrontDesk')
    const fetchMock = respondWith(200, renewed('renewed-token'))

    await renewSessionIfDue()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not renew a demo session', async () => {
    storeSession(tokenExpiringIn(5, 'demo'), 'DemoFrontDesk')
    const fetchMock = respondWith(200, renewed('renewed-token'))

    await renewSessionIfDue()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks once for a token the API will not renew', async () => {
    const token = tokenExpiringIn(5, 'refused')
    storeSession(token, 'FrontDesk')
    const fetchMock = respondWith(403, { isSuccess: false, token: null, role: null, error: 'Sign in again: a session lasts at most 12 hours' })

    await renewSessionIfDue()
    await renewSessionIfDue()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(getStoredSession()?.token).toBe(token)
  })

  it('sends one request while one is on its way', async () => {
    storeSession(tokenExpiringIn(30, 'once'), 'FrontDesk')
    let finishRequest!: (response: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve }))
    vi.stubGlobal('fetch', fetchMock)

    const first = renewSessionIfDue()
    const second = renewSessionIfDue()
    finishRequest(new Response(JSON.stringify(renewed('renewed-token'))))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(getStoredSession()?.token).toBe('renewed-token')
  })

  it('leaves a newer sign-in alone when an old renewal finishes', async () => {
    storeSession(tokenExpiringIn(30, 'old'), 'FrontDesk')
    let finishRequest!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve })))

    const pending = renewSessionIfDue()
    storeSession('new-account-token', 'Admin')
    finishRequest(new Response(JSON.stringify(renewed('renewed-token'))))
    await pending

    expect(getStoredSession()).toMatchObject({ token: 'new-account-token', role: 'Admin' })
  })

  it('tries again a minute after a network error', async () => {
    // Long ago, so the wait it leaves behind is over for the other tests.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2020-01-01T09:00:00Z'))
    storeSession(tokenExpiringIn(30, 'offline'), 'FrontDesk')
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)

    await renewSessionIfDue()
    await renewSessionIfDue()
    expect(fetchMock).toHaveBeenCalledOnce()

    vi.setSystemTime(new Date('2020-01-01T09:01:01Z'))
    await renewSessionIfDue()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
