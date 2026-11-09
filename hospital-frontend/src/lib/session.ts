let last: { token: string; expires: number | null } | null = null

export function tokenExpiry(token: string): number | null {
  if (last?.token !== token) last = { token, expires: readExpiry(token) }
  return last.expires
}

function readClaims(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) => char.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof claims === 'object' && claims !== null ? (claims as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function readExpiry(token: string) {
  const exp = readClaims(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}

const nameClaims = ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', 'unique_name', 'name']

export function tokenUserName(token: string): string | null {
  const claims = readClaims(token)
  if (!claims) return null
  for (const claim of nameClaims) {
    const value = claims[claim]
    if (typeof value === 'string' && value) return value
  }
  return null
}
