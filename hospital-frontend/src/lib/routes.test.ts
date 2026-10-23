import { describe, expect, it } from 'vitest'
import type { Screen } from '../types'
import { canSee, hashFor, initialScreen, screenFor, screenFromHash } from './routes'

const screens: Screen[] = ['reception', 'patients', 'doctor', 'departments', 'doctors', 'schedules', 'users', 'audit']

describe('screen addresses', () => {
  it('reads every screen back from its own address', () => {
    for (const screen of screens) expect(screenFromHash(hashFor(screen))).toBe(screen)
  })

  it('knows nothing of other addresses', () => {
    expect(screenFromHash('')).toBeNull()
    expect(screenFromHash('#/nowhere')).toBeNull()
    expect(screenFromHash('#/admin')).toBeNull()
  })
})

describe('screenFor', () => {
  it('opens the screen in the address when the role may see it', () => {
    expect(screenFor('Admin', '#/admin/audit-log')).toBe('audit')
    expect(screenFor('FrontDesk', '#/patients')).toBe('patients')
    expect(screenFor('Doctor', '#/my-day')).toBe('doctor')
  })

  it("falls back to the role's first screen for an address it may not see", () => {
    expect(screenFor('FrontDesk', '#/admin/users')).toBe('reception')
    expect(screenFor('Doctor', '#/patients')).toBe('doctor')
    expect(screenFor('Admin', '#/reception')).toBe('departments')
    expect(screenFor('DemoAdmin', '')).toBe('departments')
  })
})

describe('canSee', () => {
  it('gives demo accounts the screens of the role they show', () => {
    expect(canSee('DemoFrontDesk', 'patients')).toBe(true)
    expect(canSee('DemoAdmin', 'schedules')).toBe(true)
    expect(canSee('DemoAdmin', 'reception')).toBe(false)
  })

  it('gives pending accounts nothing', () => {
    for (const screen of screens) expect(canSee('Pending', screen)).toBe(false)
    expect(initialScreen('Pending')).toBe('reception')
  })
})
