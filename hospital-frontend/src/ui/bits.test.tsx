import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Pager, Segmented, Status, Switch } from './bits'
import { Dialog } from './Dialog'

function Choice({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial)
  return (
    <Segmented
      label="Slot"
      options={[
        { value: '15', label: '15' },
        { value: '20', label: '20', disabled: true },
        { value: '30', label: '30' },
      ]}
      value={value}
      onChange={setValue}
    />
  )
}

describe('Segmented', () => {
  it('moves the choice with the arrow keys and skips disabled options', () => {
    render(<Choice initial="15" />)
    const first = screen.getByRole('radio', { name: '15' })
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: '30' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(screen.getByRole('radio', { name: '30' }), { key: 'ArrowRight' })
    expect(first.getAttribute('aria-checked')).toBe('true')
  })

  it('stays reachable with the keyboard when nothing is chosen yet', () => {
    render(<Choice initial={null} />)
    expect(screen.getByRole('radio', { name: '15' }).tabIndex).toBe(0)
    expect(screen.getByRole('radio', { name: '30' }).tabIndex).toBe(-1)
  })
})

describe('Switch', () => {
  it('reports the flipped value', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} label="Open for bookings" onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Open for bookings' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Status', () => {
  it('says a past visit nobody marked is not marked', () => {
    render(<Status status="Scheduled" unmarked />)
    expect(screen.getByText('Not marked')).toBeTruthy()
  })
})

describe('Pager', () => {
  it('hides itself for a single page', () => {
    const { container } = render(
      <Pager hasNextPage={false} loading={false} noun="patients" page={1} pageSize={50} shown={12} onPage={vi.fn()} />,
    )
    expect(container.textContent).toBe('')
  })

  it('shows the range and turns pages', async () => {
    const onPage = vi.fn()
    render(<Pager hasNextPage loading={false} noun="patients" page={2} pageSize={50} shown={50} onPage={onPage} />)
    expect(screen.getByText('51–100')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(3)
  })
})

describe('Dialog', () => {
  it('closes on Escape and submits its form with Enter', async () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn()
    render(
      <Dialog title="Rename" onClose={onClose} onSubmit={onSubmit}>
        <input aria-label="Name" />
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Rename' })).toBeTruthy()
    await userEvent.type(screen.getByLabelText('Name'), 'x{Enter}')
    expect(onSubmit).toHaveBeenCalled()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalled()
  })
})
