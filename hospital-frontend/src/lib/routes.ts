import type { UserRole } from '../api/client'
import type { Screen } from '../types'

export const screenPaths: Record<Screen, string> = {
  reception: '/reception',
  patients: '/patients',
  doctor: '/my-day',
  departments: '/admin/departments',
  doctors: '/admin/doctors',
  schedules: '/admin/schedules',
  users: '/admin/users',
  audit: '/admin/audit-log',
}

export const screenTitles: Record<Screen, string> = {
  reception: 'Reception',
  patients: 'Patients',
  doctor: 'My day',
  departments: 'Departments',
  doctors: 'Doctors',
  schedules: 'Schedules',
  users: 'Users',
  audit: 'Audit log',
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

export function usesHospitalData(role: UserRole) {
  return canUseAdmin(role) || canUseReception(role)
}

export function hasScreens(role: UserRole) {
  return usesHospitalData(role) || canUseDoctor(role)
}

export function canSee(role: UserRole, screen: Screen) {
  if (screen === 'reception' || screen === 'patients') return canUseReception(role)
  if (screen === 'doctor') return canUseDoctor(role)
  return adminScreens.includes(screen) && canUseAdmin(role)
}

export function screensFor(role: UserRole): Screen[] {
  return (Object.keys(screenPaths) as Screen[]).filter((screen) => canSee(role, screen))
}

export function initialScreen(role: UserRole): Screen {
  if (canUseAdmin(role)) return 'departments'
  if (canUseDoctor(role)) return 'doctor'
  return 'reception'
}

export type Route = { path: string; params: URLSearchParams }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '')
  const [path = '', query = ''] = raw.split('?')
  return { path, params: new URLSearchParams(query) }
}

export function screenFromPath(path: string): Screen | null {
  return (Object.keys(screenPaths) as Screen[]).find((screen) => screenPaths[screen] === path) ?? null
}

export function screenFor(role: UserRole, path: string): Screen {
  const asked = screenFromPath(path)
  return asked && canSee(role, asked) ? asked : initialScreen(role)
}

export function hashFor(screen: Screen, params?: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') query.set(key, String(value))
  }
  const suffix = query.toString()
  return `#${screenPaths[screen]}${suffix ? `?${suffix}` : ''}`
}
