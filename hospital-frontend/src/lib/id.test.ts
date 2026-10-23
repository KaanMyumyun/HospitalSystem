import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './id'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('newId', () => {
  it('uses crypto.randomUUID where the browser has it', () => {
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('still works on plain HTTP, where crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })

    const first = newId()
    const second = newId()

    expect(first).toMatch(/^[0-9a-z]+-[0-9a-z]+$/)
    expect(first).not.toBe(second)
  })
})
