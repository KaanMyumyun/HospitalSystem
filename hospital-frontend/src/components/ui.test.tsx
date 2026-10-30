import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { readOnlyTitle } from '../lib/readOnly'
import { GuardedButton, Modal, TableStatus } from './ui'

describe('GuardedButton', () => {
  it('is disabled for a demo account, and says why', async () => {
    const onClick = vi.fn()
    render(
      <GuardedButton readOnly onClick={onClick} title="Saves the change">
        Save
      </GuardedButton>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveProperty('disabled', true)
    expect(button.title).toBe(readOnlyTitle)
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('works as a plain button otherwise, keeping its own disabled and title', async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <GuardedButton readOnly={false} onClick={onClick} title="Saves the change">
        Save
      </GuardedButton>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.title).toBe('Saves the change')
    expect(button.getAttribute('type')).toBe('button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()

    rerender(
      <GuardedButton readOnly={false} disabled onClick={onClick}>
        Save
      </GuardedButton>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })
})

describe('TableStatus', () => {
  it('shows placeholder rows while loading, even when empty', () => {
    const { container } = render(<TableStatus loading empty emptyText="No doctors yet." />)

    expect(container.querySelectorAll('.skeleton-list span')).toHaveLength(5)
    expect(screen.queryByText('No doctors yet.')).toBeNull()
  })

  it('says so when there are no rows, and shows nothing when there are', () => {
    const { container, rerender } = render(<TableStatus loading={false} empty emptyText="No doctors yet." />)
    expect(screen.getByText('No doctors yet.')).toBeTruthy()

    rerender(<TableStatus loading={false} empty={false} emptyText="No doctors yet." />)
    expect(container.innerHTML).toBe('')
  })
})

describe('Modal', () => {
  function Opener() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        {open && (
          <Modal title="Book appointment" onClose={() => setOpen(false)}>
            <label>
              Patient Name
              <input />
            </label>
          </Modal>
        )}
      </>
    )
  }

  it('opens with focus on its first field and gives it back when it closes', async () => {
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'Open' })

    await userEvent.click(opener)
    expect(screen.getByRole('dialog', { name: 'Book appointment' })).toHaveProperty('open', true)
    expect(document.activeElement).toBe(screen.getByLabelText('Patient Name'))

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('closes through the app on Escape, so the browser does not close it alone', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Cancel appointment" onClose={onClose}>
        <p>Sure?</p>
      </Modal>,
    )

    const escape = new Event('cancel', { cancelable: true })
    fireEvent(screen.getByRole('dialog', { name: 'Cancel appointment' }), escape)

    expect(onClose).toHaveBeenCalledOnce()
    expect(escape.defaultPrevented).toBe(true)
  })
})
