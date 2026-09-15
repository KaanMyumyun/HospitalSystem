export function parseDateInput(value: string) {
  const [year = '0', month = '1', day = '1'] = value.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
}

export function toDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  const birthDate = parseDateInput(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return 'Date of birth is invalid'
  if (birthDate.getTime() > appointmentTime.getTime()) {
    return 'Date of birth cannot be after the appointment date'
  }

  return null
}
