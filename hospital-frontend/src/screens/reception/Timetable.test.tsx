import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { appointment, schedule } from '../../test/render'
import type { Slot } from '../../types'
import { Timetable } from './Timetable'

const monday = new Date('2099-03-02T00:00:00Z')
const tuesday = new Date('2099-03-03T00:00:00Z')

function grid(): Slot[][] {
  return [
    [
      { day: monday, time: '09:00', status: 'booked', appointment: appointment() },
      { day: tuesday, time: '09:00', status: 'available' },
    ],
    [
      { day: monday, time: '09:30', status: 'available' },
      { day: tuesday, time: '09:30', status: 'break' },
    ],
  ]
}

function renderTimetable(onPick = vi.fn(), selectedId: number | null = null) {
  render(
    <Timetable
      days={[monday, tuesday]}
      moving={null}
      now={Date.parse('2099-03-01T12:00:00Z')}
      schedule={schedule()}
      selectedId={selectedId}
      slots={grid()}
      onPick={onPick}
    />,
  )
  return onPick
}

describe('Timetable', () => {
  it('names the patient in a booked slot and says when a slot is open', () => {
    renderTimetable()
    expect(screen.getByRole('button', { name: /09:00: Grace Hopper, scheduled/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tuesday 3 March, 09:00: open' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Tuesday 3 March, 09:30: break' })).toBeTruthy()
  })

  it('hands the chosen slot back', async () => {
    const onPick = renderTimetable()
    await userEvent.click(screen.getByRole('button', { name: 'Tuesday 3 March, 09:00: open' }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ time: '09:00', status: 'available', day: tuesday }))
  })

  it('keeps one slot in the tab order and moves between slots with the arrow keys', () => {
    renderTimetable()
    const tabbable = screen.getAllByRole('button').filter((button) => button.tabIndex === 0)
    expect(tabbable).toHaveLength(1)

    const booked = screen.getByRole('button', { name: /Grace Hopper/ })
    booked.focus()
    fireEvent.keyDown(booked, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Tuesday 3 March, 09:00: open' }))

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Tuesday 3 March, 09:00: open' }))

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Monday 2 March, 09:30: open' }))
  })

  it('marks the selected booking as pressed', () => {
    renderTimetable(vi.fn(), 42)
    expect(screen.getByRole('button', { name: /Grace Hopper/ }).getAttribute('aria-pressed')).toBe('true')
  })
})
