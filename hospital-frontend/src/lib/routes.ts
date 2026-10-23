import type { UserRole } from '../api'
import type { Screen } from '../types'

// Every screen has an address after the #, so the back button, a refresh and
// a bookmark all work. The hash rather than the path: the servers answer
// only "/" with the app and send a real 404 for every other path.
const screenPaths: Record<Screen, string> = {
  reception: '/reception',
  patients: '/patients',
  doctor: '/my-day',
  departments: '/admin/departments',
  doctors: '/admin/doctors',
  schedules: '/admin/schedules',
  users: '/admin/users',
  audit: '/admin/audit-log',
}

const adminScreens: Screen[] = ['departments', 'doctors', 'schedules', 'users', 'audit']

export function canUseAdmin(role: UserRole) {
  return role === 'Admin' || role === 'DemoAdmin'
}

export function canUseReception(role: UserRole) {
  return role === 'FrontDesk' || role === 'DemoFrontDesk'
}

export function canUseDoctor(role: UserRole) {
  return role === 'Doctor'
}

// Admin and reception screens share the departments, doctors and schedules.
export function usesHospitalData(role: UserRole) {
  return canUseAdmin(role) || canUseReception(role)
}

export function canSee(role: UserRole, screen: Screen) {
  if (screen === 'reception' || screen === 'patients') return canUseReception(role)
  if (screen === 'doctor') return canUseDoctor(role)
  return adminScreens.includes(screen) && canUseAdmin(role)
}

export function initialScreen(role: UserRole): Screen {
  if (canUseAdmin(role)) return 'departments'
  if (canUseDoctor(role)) return 'doctor'
  return 'reception'
}

export function hashFor(screen: Screen) {
  return `#${screenPaths[screen]}`
}

export function screenFromHash(hash: string): Screen | null {
  const path = hash.replace(/^#/, '')
  return (Object.keys(screenPaths) as Screen[]).find((screen) => screenPaths[screen] === path) ?? null
}

// The screen the address asks for, if this role may see it; otherwise the
// role's first screen.
export function screenFor(role: UserRole, hash: string): Screen {
  const asked = screenFromHash(hash)
  return asked && canSee(role, asked) ? asked : initialScreen(role)
}
