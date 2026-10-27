// When a JWT runs out, in milliseconds since 1970, from its exp claim; null
// when it cannot be read. Only to decide when to renew it: the API checks
// tokens itself.
let last: { token: string; expires: number | null } | null = null

export function tokenExpiry(token: string): number | null {
  if (last?.token !== token) last = { token, expires: readExpiry(token) }
  return last.expires
}

function readExpiry(token: string) {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    // base64url, without padding.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const exp = typeof claims === 'object' && claims !== null ? (claims as { exp?: unknown }).exp : undefined
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}
