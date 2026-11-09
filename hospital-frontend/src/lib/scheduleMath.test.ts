import { describe, expect, it } from 'vitest'
import { slotsPerDay } from './scheduleMath'

describe('slotsPerDay', () => {
  it('counts the slots that fit in the working hours', () => {
    expect(slotsPerDay(8 * 60, 16 * 60, 30, null, null)).toBe(16)
  })

  it('leaves out slots that touch the break', () => {
    expect(slotsPerDay(8 * 60, 16 * 60, 30, 12 * 60, 13 * 60)).toBe(14)
    expect(slotsPerDay(8 * 60, 15 * 60, 20, 12 * 60, 12 * 60 + 40)).toBe(19)
  })

  it('gives nothing for an empty or reversed window', () => {
    expect(slotsPerDay(10 * 60, 10 * 60, 30, null, null)).toBe(0)
    expect(slotsPerDay(10 * 60, 9 * 60, 30, null, null)).toBe(0)
  })
})
