import { describe, expect, it } from 'vitest'
import { sessionAfterTokenRotation } from './session'

describe('sessionAfterTokenRotation', () => {
  const original = { token: 'old-token', role: 'FrontDesk' } as const

  it('accepts the token returned by a current password change', () => {
    const rotated = { token: 'rotated-token', role: 'FrontDesk' } as const

    expect(sessionAfterTokenRotation(original, rotated, 'rotated-token', true)).toEqual(rotated)
  })

  it('rejects a response after logout or another sign-in', () => {
    expect(sessionAfterTokenRotation(original, null, 'rotated-token', false)).toBeNull()
    expect(sessionAfterTokenRotation(original, { token: 'other-token', role: 'Admin' }, 'rotated-token', true)).toBeNull()
    expect(sessionAfterTokenRotation(original, { token: 'rotated-token', role: 'Admin' }, 'rotated-token', true)).toBeNull()
    expect(sessionAfterTokenRotation(original, { token: 'rotated-token', role: 'FrontDesk' }, 'rotated-token', false)).toBeNull()
  })
})
