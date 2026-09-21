export function parseBody(text: string) {
  if (!text) return { payload: null, isJson: true }

  try {
    return { payload: JSON.parse(text), isJson: true }
  } catch {
    return { payload: null, isJson: false }
  }
}

export function tooManyRequestsMessage(retryAfter: string | null) {
  const seconds = Number(retryAfter)
  if (!retryAfter || !Number.isInteger(seconds) || seconds <= 0) {
    return 'Too many requests. Please wait a moment and try again.'
  }
  return `Too many requests. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
}

export function unreadableResponseMessage(status: number) {
  return status >= 500
    ? `The server is unavailable right now (${status}). Please try again shortly.`
    : `Unexpected response from the server (${status}).`
}
