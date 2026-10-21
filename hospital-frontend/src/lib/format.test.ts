import { describe, expect, it } from 'vitest'
import { formatWorkingDays, statusLabel } from './format'

describe('formatWorkingDays', () => {
  it('shortens a run of three or more days', () => {
    expect(formatWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])).toBe('Mon-Fri')
  })

  it('lists days that are not a run, Monday first', () => {
    expect(formatWorkingDays(['Saturday', 'Monday', 'Wednesday'])).toBe('Mon, Wed, Sat')
  })

  it('lists two days in a row as two days', () => {
    expect(formatWorkingDays(['Tuesday', 'Monday'])).toBe('Mon, Tue')
  })
})

describe('statusLabel', () => {
  it('writes NoShow as two words', () => {
    expect(statusLabel('NoShow')).toBe('No-show')
    expect(statusLabel('Completed')).toBe('Completed')
  })
})
