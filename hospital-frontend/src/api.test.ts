import { afterEach, describe, expect, it, vi } from 'vitest'
import { wakeApi } from './api'

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('wakeApi', () => {
  it('pings the readiness check without waiting for an answer', () => {
    const fetchMock = respondWith(200, {})

    wakeApi()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5272/health/ready', {
      mode: 'no-cors',
      cache: 'no-store',
    })
  })
})
