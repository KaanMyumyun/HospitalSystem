import { describe, expect, it } from 'vitest'
import { formatPhone } from './phone'

describe('formatPhone', () => {
  it('groups Bulgarian mobile numbers', () => {
    expect(formatPhone('+359888123456')).toBe('+359 88 812 3456')
    expect(formatPhone('0888123456')).toBe('0888 123 456')
  })

  it('groups Sofia landlines', () => {
    expect(formatPhone('+35929876543')).toBe('+359 2 987 6543')
    expect(formatPhone('029876543')).toBe('02 987 6543')
  })

  it('leaves numbers it does not know as they were stored', () => {
    expect(formatPhone('+442071234567')).toBe('+442071234567')
    expect(formatPhone('12345')).toBe('12345')
    expect(formatPhone('+35912')).toBe('+35912')
  })
})
