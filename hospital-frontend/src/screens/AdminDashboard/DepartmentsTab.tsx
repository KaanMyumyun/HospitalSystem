import { useState } from 'react'
import type { DepartmentDto } from '../../api'
import { GuardedButton, StatusBadge, TableStatus } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { coverageForDepartment } from '../../lib/schedule'
import type { ActionOutcome } from '../../types'

// The top bar's search filters this table.
export function DepartmentsTab({
  selectedDepartmentId,
  onChangeDepartmentStatus,
  onCreateDepartment,
  onSelectDepartment,
}: {
  selectedDepartmentId: number | null
  onChangeDepartmentStatus: (department: DepartmentDto, isActive: boolean) => Promise<ActionOutcome>
  onCreateDepartment: (name: string) => Promise<ActionOutcome>
  onSelectDepartment: (departmentId: number) => void
}) {
  const { departments, doctors, schedules, loading, searchQuery, isReadOnly } = useWorkspace()
  const [departmentNameInput, setDepartmentNameInput] = useState('')
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDepartments = departments.filter(
    (department) => !normalizedSearch || department.name.toLowerCase().includes(normalizedSearch),
  )

  return (
    <>
      <div className="toolbar">
        <div className="inline-form">
          <input
            aria-label="New department name"
            maxLength={100}
            placeholder="New department"
            value={departmentNameInput}
            onChange={(event) => setDepartmentNameInput(event.target.value)}
          />
          <GuardedButton
            className="secondary-button"
            readOnly={isReadOnly}
            disabled={!departmentNameInput.trim() || loading}
            onClick={async () => {
              if ((await onCreateDepartment(departmentNameInput)).ok) setDepartmentNameInput('')
            }}
          >
            Add Department
          </GuardedButton>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Status</th>
            <th>Doctors</th>
            <th>Coverage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleDepartments.map((department) => {
            const departmentDoctors = doctors.filter((doctor) => doctor.departmentId === department.id)
            const selected = department.id === selectedDepartmentId
            return (
              <tr className={selected ? 'selected-row' : ''} key={department.id}>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectDepartment(department.id)}
                  >
                    {department.name}
                  </button>
                </td>
                <td>
                  <StatusBadge tone={department.isActive ? 'success' : 'muted'}>
                    {department.isActive ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </td>
                <td>{departmentDoctors.length}</td>
                <td>{coverageForDepartment(schedules, departmentDoctors)}</td>
                <td>
                  <GuardedButton
                    className="secondary-button compact-action"
                    readOnly={isReadOnly}
                    disabled={loading}
                    onClick={() => void onChangeDepartmentStatus(department, !department.isActive)}
                  >
                    {department.isActive ? 'Deactivate' : 'Activate'}
                  </GuardedButton>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <TableStatus loading={loading} empty={visibleDepartments.length === 0} emptyText="No departments found." />
    </>
  )
}
