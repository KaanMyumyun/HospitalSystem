import { describe, expect, it } from 'vitest'
import { parseBody, tooManyRequestsMessage, unreadableResponseMessage } from './http'

describe('parseBody', () => {
  it('parses JSON', () => {
    expect(parseBody('{"error":"Nope"}')).toEqual({ payload: { error: 'Nope' }, isJson: true })
  })

  it('treats an empty body as no payload', () => {
    expect(parseBody('')).toEqual({ payload: null, isJson: true })
  })

  it('does not throw on an HTML error page', () => {
    expect(parseBody('<html><body>502 Bad Gateway</body></html>')).toEqual({
      payload: null,
      isJson: false,
    })
  })

  it('does not throw on plain text', () => {
    expect(parseBody('Rate limit exceeded')).toEqual({ payload: null, isJson: false })
  })
})

describe('tooManyRequestsMessage', () => {
  it('says how long to wait', () => {
    expect(tooManyRequestsMessage('42')).toBe('Too many requests. Try again in 42 seconds.')
  })

  it('uses the singular for one second', () => {
    expect(tooManyRequestsMessage('1')).toBe('Too many requests. Try again in 1 second.')
  })

  it.each([null, '', 'soon', '0', '-5', '1.5', 'Wed, 21 Oct 2026 07:28:00 GMT'])(
    'falls back to a general message for %j',
    (value) => {
      expect(tooManyRequestsMessage(value)).toBe(
        'Too many requests. Please wait a moment and try again.',
      )
    },
  )
})

describe('unreadableResponseMessage', () => {
  it('reports a server error as unavailable', () => {
    expect(unreadableResponseMessage(502)).toBe(
      'The server is unavailable right now (502). Please try again shortly.',
    )
  })

  it('reports anything else as unexpected', () => {
    expect(unreadableResponseMessage(404)).toBe('Unexpected response from the server (404).')
  })
})
