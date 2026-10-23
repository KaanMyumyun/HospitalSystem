// A unique id for things this browser keeps, such as recent activity.
// crypto.randomUUID exists only on HTTPS and localhost; served over plain
// HTTP from anywhere else, the app falls back to time and chance.
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
