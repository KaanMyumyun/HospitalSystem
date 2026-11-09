import { afterEach, describe, expect, it } from 'vitest'
import { setClinicTimeZone } from './clinicTime'
import { addMinutes, ageOn, dateOnlyLabel, greeting, relativeDay, timeOf, weekRangeLabel, zoneCity } from './dates'

afterEach(() => setClinicTimeZone('UTC'))

describe('weekRangeLabel', () => {
  it('names the month once inside one month', () => {
    setClinicTimeZone('Europe/Sofia')
    expect(weekRangeLabel(new Date('2026-11-08T22:00:00Z'), new Date('2026-11-14T22:00:00Z'))).toBe('9–15 November 2026')
  })

  it('shortens both months across a month end', () => {
    setClinicTimeZone('Europe/Sofia')
    expect(weekRangeLabel(new Date('2026-11-29T22:00:00Z'), new Date('2026-12-05T22:00:00Z'))).toBe('30 Nov – 6 Dec 2026')
  })

  it('gives both years across a year end', () => {
    setClinicTimeZone('UTC')
    expect(weekRangeLabel(new Date('2026-12-28T00:00:00Z'), new Date('2027-01-03T00:00:00Z'))).toBe(
      '28 Dec 2026 – 3 Jan 2027',
    )
  })
})

describe('clinic readings', () => {
  it('reads times on the clinic clock', () => {
    setClinicTimeZone('Asia/Tokyo')
    expect(timeOf(new Date('2026-11-09T00:30:00Z'))).toBe('09:30')
  })

  it('names today, tomorrow and yesterday on the clinic calendar', () => {
    setClinicTimeZone('Europe/Sofia')
    const now = new Date('2026-11-08T21:30:00Z')
    expect(relativeDay(new Date('2026-11-08T23:00:00Z'), now)).toBe('Tomorrow')
    expect(relativeDay(new Date('2026-11-08T10:00:00Z'), now)).toBe('Today')
    expect(relativeDay(new Date('2026-11-07T10:00:00Z'), now)).toBe('Yesterday')
    expect(relativeDay(new Date('2026-11-12T10:00:00Z'), now)).toBeNull()
  })

  it('greets by the clinic hour', () => {
    setClinicTimeZone('Europe/Sofia')
    expect(greeting(new Date('2026-11-09T06:00:00Z'))).toBe('Good morning')
    expect(greeting(new Date('2026-11-09T12:00:00Z'))).toBe('Good afternoon')
    expect(greeting(new Date('2026-11-09T20:00:00Z'))).toBe('Good evening')
  })
})

describe('dates without a time', () => {
  it('formats a birth date without shifting it', () => {
    setClinicTimeZone('Pacific/Kiritimati')
    expect(dateOnlyLabel('1987-03-14')).toBe('14 Mar 1987')
  })

  it('counts age in whole years', () => {
    expect(ageOn('1987-03-14', '2026-03-13')).toBe(38)
    expect(ageOn('1987-03-14', '2026-03-14')).toBe(39)
    expect(ageOn('2026-05-01', '2026-03-01')).toBe(0)
  })

  it('adds minutes to a clock reading', () => {
    expect(addMinutes('09:40', 30)).toBe('10:10')
    expect(addMinutes('23:45', 30)).toBe('00:15')
  })

  it('takes the city from a zone name', () => {
    expect(zoneCity('America/New_York')).toBe('New York')
  })
})
