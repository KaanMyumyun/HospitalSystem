export function personName(userName: string) {
  const trimmed = userName.trim()
  if (/\s/.test(trimmed) || !/[._-]/.test(trimmed)) return trimmed
  return trimmed
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => (part === part.toLowerCase() ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}` : part))
    .join(' ')
}

export function initialsOf(name: string) {
  const parts = personName(name)
    .replace(/^(dr|dr\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export function departmentHue(departmentId: number | undefined) {
  if (departmentId === undefined) return 0
  return ((Math.abs(departmentId) - 1) % 8) + 1
}

const actionLabels: Record<string, string> = {
  AddTimeOff: 'Added time off',
  CancelAppointment: 'Cancelled a booking',
  ChangeAppointmentStatus: 'Marked a visit',
  ChangeDepartmentStatus: 'Changed department status',
  ChangeDoctorDepartment: 'Moved a doctor',
  ChangeDoctorStatus: 'Changed doctor status',
  ChangePassword: 'Changed own password',
  ChangePasswordFailed: 'Password change failed',
  ChangeSchedule: 'Changed a schedule',
  ChangeUserRole: 'Changed a role',
  CreateAppointment: 'Booked an appointment',
  CreateDepartment: 'Created a department',
  CreateDoctor: 'Made a doctor',
  CreateSchedule: 'Created a schedule',
  CreateUser: 'Created a user',
  MoveAppointment: 'Moved a booking',
  RemoveTimeOff: 'Removed time off',
  ResetPassword: 'Reset a password',
  SignInFailed: 'Failed sign-in',
  SignInLocked: 'Account locked',
  UpdatePatient: 'Updated a patient',
}

export function auditTone(action: string): 'security' | 'booking' | 'change' {
  if (/Failed|Locked/.test(action)) return 'security'
  if (/Appointment|Patient/.test(action)) return 'booking'
  return 'change'
}

export function humanizeAction(action: string) {
  const known = actionLabels[action]
  if (known) return known
  const words = action
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_]+/)
    .filter(Boolean)
  return words.map((word, index) => (index === 0 ? word : word.toLowerCase())).join(' ')
}
