function groups(digits: string, sizes: number[]) {
  const parts: string[] = []
  let at = 0
  for (const size of sizes) {
    parts.push(digits.slice(at, at + size))
    at += size
  }
  return parts.join(' ')
}

export function formatPhone(stored: string) {
  const compact = stored.replace(/[\s().-]/g, '')
  const international = /^\+359(\d{8,9})$/.exec(compact)
  if (international) {
    const rest = international[1] ?? ''
    if (rest.length === 9 && /^[89]/.test(rest)) return `+359 ${groups(rest, [2, 3, 4])}`
    if (rest.length === 8 && rest.startsWith('2')) return `+359 ${groups(rest, [1, 3, 4])}`
    return stored
  }
  if (/^0[89]\d{8}$/.test(compact)) return groups(compact, [4, 3, 3])
  if (/^02\d{7}$/.test(compact)) return groups(compact, [2, 3, 4])
  return stored
}
