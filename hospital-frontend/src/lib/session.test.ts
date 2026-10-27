import { describe, expect, it } from 'vitest'
import { tokenExpiry } from './session'

// A token with these claims; the API's signature does not matter here.
function fakeToken(claims: Record<string, unknown>) {
  const base64url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}.signature`
}

describe('tokenExpiry', () => {
  it('reads exp, in seconds, as milliseconds', () => {
    expect(tokenExpiry(fakeToken({ exp: 1_800_000_000, role: 'FrontDesk' }))).toBe(1_800_000_000_000)
  })

  it('reads a payload that needs base64url characters and padding', () => {
    // "~~~" encodes to "fn5-": a "-" where base64 has "+".
    expect(tokenExpiry(fakeToken({ exp: 1_800_000_123, name: '~~~?' }))).toBe(1_800_000_123_000)
  })

  it('gives null for a token it cannot read', () => {
    expect(tokenExpiry('not-a-token')).toBeNull()
    expect(tokenExpiry('a.!!!.c')).toBeNull()
    expect(tokenExpiry(fakeToken({ role: 'FrontDesk' }))).toBeNull()
  })
})
