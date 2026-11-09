import { describe, expect, it } from 'vitest'
import { tokenExpiry, tokenUserName } from './session'

function fakeToken(claims: Record<string, unknown>) {
  const base64url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}.signature`
}

describe('tokenExpiry', () => {
  it('reads exp, in seconds, as milliseconds', () => {
    expect(tokenExpiry(fakeToken({ exp: 1_800_000_000, role: 'FrontDesk' }))).toBe(1_800_000_000_000)
  })

  it('reads a payload that needs base64url characters and padding', () => {
    expect(tokenExpiry(fakeToken({ exp: 1_800_000_123, name: '~~~?' }))).toBe(1_800_000_123_000)
  })

  it('gives null for a token it cannot read', () => {
    expect(tokenExpiry('not-a-token')).toBeNull()
    expect(tokenExpiry('a.!!!.c')).toBeNull()
    expect(tokenExpiry(fakeToken({ role: 'FrontDesk' }))).toBeNull()
  })
})

describe('tokenUserName', () => {
  it('reads the name claim ASP.NET Core writes', () => {
    expect(tokenUserName(fakeToken({ 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'desk.anna' }))).toBe(
      'desk.anna',
    )
  })

  it('falls back to the short claim names', () => {
    expect(tokenUserName(fakeToken({ unique_name: 'elena.markova' }))).toBe('elena.markova')
  })

  it('gives null without a name', () => {
    expect(tokenUserName(fakeToken({ exp: 1 }))).toBeNull()
    expect(tokenUserName('broken')).toBeNull()
  })
})
