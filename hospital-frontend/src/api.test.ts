import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AffectedBookingsError, changeOwnPassword, changeSchedule, createAppointment, PossiblePatientMatchError, wakeApi } from './api'

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

// The tests run in Node, which has no localStorage.
let stored: Record<string, string> = {}

beforeEach(() => {
  stored = {}
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored[key] ?? null,
    setItem: (key: string, value: string) => {
      stored[key] = value
    },
    removeItem: (key: string) => {
      delete stored[key]
    },
  })
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

    await changeSchedule({ scheduleId: 1, startHour: 9, endHour: 17, slotDurationMin: 30 })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('reports bookings the change would strand', async () => {
    respondWith(409, {
      isSuccess: false,
      error: 'This change affects 3 future bookings.',
      affectedAppointmentCount: 3,
      affectedAppointments: [{ appointmentId: 10, appointmentTime: '2030-06-03T06:00:00Z', doctorName: 'drhouse', patientInitials: 'MI' }],
    })

    const error = await changeSchedule({ scheduleId: 1, startHour: 12, endHour: 17, slotDurationMin: 30 }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(AffectedBookingsError)
    expect((error as AffectedBookingsError).count).toBe(3)
    expect((error as AffectedBookingsError).bookings.map((booking) => booking.patientInitials)).toEqual(['MI'])
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
})
