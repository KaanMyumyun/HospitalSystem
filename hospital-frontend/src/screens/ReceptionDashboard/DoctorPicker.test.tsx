import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DoctorDto } from '../../api'
import { department, doctor, renderInWorkspace } from '../../test/render'
import { DoctorPicker } from './DoctorPicker'

const cardiology = department()
const neurology = department({ id: 2, name: 'Neurology' })
const ada = doctor()
const alan = doctor({ doctorId: 8, userId: 80, name: 'Dr. Alan Turing', departmentId: 2 })
const resting = doctor({ doctorId: 9, userId: 90, name: 'Dr. Inactive', isActive: false })

function show(shown: DoctorDto[], loading = false) {
  const handlers = { onDepartmentFilterChange: vi.fn(), onSelectDoctor: vi.fn() }
  renderInWorkspace(
    <DoctorPicker
      activeDepartments={[cardiology, neurology]}
      departmentFilter="all"
      doctors={shown}
      selectedDoctorId={ada.doctorId}
      {...handlers}
    />,
    { departments: [cardiology, neurology], doctors: [ada, alan, resting], loading },
  )
  return handlers
}

describe('DoctorPicker', () => {
  it("counts each active department's active doctors, and filters by one", async () => {
    const { onDepartmentFilterChange } = show([ada, alan])

    const pill = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
    expect(pill('All').textContent).toBe('All2 doctors')
    expect(pill('Cardiology').textContent).toBe('Cardiology1 doctors')
    await userEvent.click(pill('Neurology'))
    expect(onDepartmentFilterChange).toHaveBeenCalledWith(2)
  })

  it('lists the doctors it is given, with their departments, and picks one', async () => {
    const { onSelectDoctor } = show([ada, alan])

    const alanCard = screen.getByRole('button', { name: /Dr\. Alan Turing/ })
    expect(alanCard.textContent).toContain('Neurology')
    expect(screen.getByRole('button', { name: /Dr\. Ada Lovelace/ }).className).toContain('selected')
    await userEvent.click(alanCard)
    expect(onSelectDoctor).toHaveBeenCalledWith(8)
  })

  it('says so when no doctor matches', () => {
    show([])
    expect(screen.getByText('No active doctors returned by the API.')).toBeTruthy()
  })

  it('says nothing about an empty list while it is still loading', () => {
    show([], true)
    expect(screen.queryByText('No active doctors returned by the API.')).toBeNull()
  })
})
