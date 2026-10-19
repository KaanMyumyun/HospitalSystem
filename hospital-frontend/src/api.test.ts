import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppointment, PossiblePatientMatchError, wakeApi } from './api'

const booking = {
  DoctorId: 1,
  PatientName: 'Child Ivanov',
  PhoneNumber: '0888 111 222',
  DateOfBirth: '2016-08-20',
  AppointmentTime: '2027-03-01T09:20:00+03:00',
}

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  // The tests run in Node, which has no localStorage.
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
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
