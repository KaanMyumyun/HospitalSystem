import { describe, expect, it } from 'vitest'
import { filterBySearch } from './search'

const doctors = [
  { name: 'Dr. Ada Lovelace', department: 'Cardiology' },
  { name: 'Dr. Alan Turing', department: 'Neurology' },
  { name: 'Dr. Grace Hopper', department: null },
]
const fields = (doctor: (typeof doctors)[number]) => [doctor.name, doctor.department]

describe('filterBySearch', () => {
  it('keeps every item, as the same array, for an empty or blank search', () => {
    expect(filterBySearch(doctors, '', fields)).toBe(doctors)
    expect(filterBySearch(doctors, '   ', fields)).toBe(doctors)
  })

  it('matches any field, ignoring case and surrounding spaces', () => {
    expect(filterBySearch(doctors, '  TURING ', fields).map((doctor) => doctor.name)).toEqual(['Dr. Alan Turing'])
    expect(filterBySearch(doctors, 'cardio', fields).map((doctor) => doctor.name)).toEqual(['Dr. Ada Lovelace'])
  })

  it('skips missing fields and returns nothing when nothing matches', () => {
    expect(filterBySearch(doctors, 'hopper', fields).map((doctor) => doctor.name)).toEqual(['Dr. Grace Hopper'])
    expect(filterBySearch(doctors, 'oncology', fields)).toEqual([])
  })
})
