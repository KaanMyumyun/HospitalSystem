import { describe, expect, it } from 'vitest'
import { validateAppointmentInput } from './validation'

describe('validateAppointmentInput', () => {
  const appointmentTime = new Date('2026-06-15T10:00:00Z')

  it('requires a patient name', () => {
    expect(validateAppointmentInput('', '5550100', '1990-05-20', appointmentTime)).toBe(
      'Patient name is required',
    )
  })

  it('requires a phone number', () => {
    expect(validateAppointmentInput('Jane Doe', '   ', '1990-05-20', appointmentTime)).toBe(
      'Phone number is required',
    )
  })

  it('rejects a phone number with letters', () => {
    expect(validateAppointmentInput('Jane Doe', '555-01AB', '1990-05-20', appointmentTime)).toBe(
      'Phone number must contain 7 to 15 digits and no letters',
    )
  })

  it('rejects a phone number with too few digits', () => {
    expect(validateAppointmentInput('Jane Doe', '12345', '1990-05-20', appointmentTime)).toBe(
      'Phone number must contain 7 to 15 digits and no letters',
    )
  })

  it('requires a date of birth', () => {
    expect(validateAppointmentInput('Jane Doe', '5550100', '', appointmentTime)).toBe(
      'Date of birth is required',
    )
  })

  it('rejects an unparseable date of birth', () => {
    expect(validateAppointmentInput('Jane Doe', '5550100', 'not-a-date', appointmentTime)).toBe(
      'Date of birth is invalid',
    )
  })

  it('rejects a date of birth after the appointment date', () => {
    expect(validateAppointmentInput('Jane Doe', '5550100', '2030-01-01', appointmentTime)).toBe(
      'Date of birth cannot be after the appointment date',
    )
  })

  it('accepts valid input', () => {
    expect(validateAppointmentInput('Jane Doe', '+1 (555) 010-0100', '1990-05-20', appointmentTime)).toBeNull()
  })
})
