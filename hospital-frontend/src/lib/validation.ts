import { clinicDate } from './clinicTime'

// Today's clinic date, as a date input's value.
export function todayInputValue() {
  return clinicDate(new Date())
}

// A date input's value names a real day: 2026-02-30 does not.
export function isDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.toISOString().slice(0, 10) === value
}

export function validateAppointmentInput(
  patientName: string,
  phoneNumber: string,
  dateOfBirth: string,
  appointmentTime: Date,
) {
  if (!patientName.trim()) return 'Patient name is required'
  if (!phoneNumber.trim()) return 'Phone number is required'

  const digitCount = Array.from(phoneNumber).filter((char) => /\d/.test(char)).length
  if (!/^\+?[0-9\s().-]+$/.test(phoneNumber) || digitCount < 7 || digitCount > 15) {
    return 'Phone number must contain 7 to 15 digits and no letters'
  }

  if (!dateOfBirth) return 'Date of birth is required'

  if (!isDateInput(dateOfBirth)) return 'Date of birth is invalid'
  // Dates in this form compare in order as text.
  if (dateOfBirth > clinicDate(appointmentTime)) {
    return 'Date of birth cannot be after the appointment date'
  }

  return null
}
