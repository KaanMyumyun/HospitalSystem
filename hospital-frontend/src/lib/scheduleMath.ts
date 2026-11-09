import type { DayOfWeek } from '../api/client'

export const weekOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function slotsPerDay(startMinutes: number, endMinutes: number, slot: number, breakStart: number | null, breakEnd: number | null) {
  if (slot <= 0 || endMinutes <= startMinutes) return 0
  let count = 0
  for (let minutes = startMinutes; minutes + slot <= endMinutes; minutes += slot) {
    if (breakStart !== null && breakEnd !== null && minutes < breakEnd && minutes + slot > breakStart) continue
    count++
  }
  return count
}
