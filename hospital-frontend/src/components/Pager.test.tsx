import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pager } from './Pager'

function page(pageNumber: number, itemCount: number, hasNextPage: boolean) {
  return { items: Array.from({ length: itemCount }, (_, index) => index), page: pageNumber, pageSize: 50, hasNextPage }
}

describe('Pager', () => {
  it('shows nothing when everything fits on the first page', () => {
    const { container } = render(<Pager page={page(1, 12, false)} loading={false} noun="patients" onPageChange={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the rows on this page and moves on while another page follows', async () => {
    const onPageChange = vi.fn()
    render(<Pager page={page(1, 50, true)} loading={false} noun="patients" onPageChange={onPageChange} />)

    expect(screen.getByText('1-50')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('gives the total on the last page, where it is known', async () => {
    const onPageChange = vi.fn()
    render(<Pager page={page(2, 23, false)} loading={false} noun="patients" onPageChange={onPageChange} />)

    expect(screen.getByText('51-73 of 73')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('says when a later page has nothing left', () => {
    render(<Pager page={page(3, 0, false)} loading={false} noun="patients" onPageChange={vi.fn()} />)

    expect(screen.getByText('No more patients')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', false)
  })

  it('waits for the page it is loading', () => {
    render(<Pager page={page(2, 50, true)} loading noun="patients" onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  })
})
