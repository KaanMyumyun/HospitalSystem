import { Search } from 'lucide-react'
import { useState } from 'react'
import type { DepartmentDto, DoctorDto, ScheduleDto } from '../../api'
import { EmptyState, SkeletonRows, StatusBadge } from '../../components/ui'
import { coverageForDepartment } from '../../lib/schedule'

export function DepartmentsTab({
  departments,
  doctors,
  schedules,
  loading,
  searchQuery,
  selectedDepartmentId,
  isReadOnly,
  onChangeDepartmentStatus,
  onCreateDepartment,
  onSelectDepartment,
}: {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  schedules: ScheduleDto[]
  loading: boolean
  searchQuery: string
  selectedDepartmentId: number | null
  isReadOnly: boolean
  onChangeDepartmentStatus: (departmentId: number, isActive: boolean) => Promise<void>
  onCreateDepartment: (name: string) => Promise<void>
  onSelectDepartment: (departmentId: number) => void
}) {
  const [departmentNameInput, setDepartmentNameInput] = useState('')
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDepartments = departments.filter(
    (department) => !normalizedSearch || department.name.toLowerCase().includes(normalizedSearch),
  )

  return (
    <>
      <div className="toolbar">
        <div className="search-field compact">
          <Search size={16} />
          <input aria-label="Search departments" placeholder="Search departments" />
        </div>
        <div className="inline-form">
          <input
            placeholder="New department"
            value={departmentNameInput}
            onChange={(event) => setDepartmentNameInput(event.target.value)}
          />
          <button
            className="secondary-button"
            disabled={!departmentNameInput.trim() || isReadOnly}
            title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
            type="button"
            onClick={() => {
              void onCreateDepartment(departmentNameInput)
              setDepartmentNameInput('')
            }}
          >
            Add Department
          </button>
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
            return (
              <tr
                className={department.id === selectedDepartmentId ? 'selected-row' : ''}
                key={department.id}
                onClick={() => onSelectDepartment(department.id)}
              >
                <td>
                  <strong>{department.name}</strong>
                </td>
                <td>
                  <StatusBadge tone={department.isActive ? 'success' : 'muted'}>
                    {department.isActive ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </td>
                <td>{departmentDoctors.length}</td>
                <td>{coverageForDepartment(schedules, departmentDoctors)}</td>
                <td>
                  <button
                    className="secondary-button compact-action"
                    disabled={isReadOnly}
                    title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void onChangeDepartmentStatus(department.id, !department.isActive)
                    }}
                  >
                    {department.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {loading && <SkeletonRows count={5} />}
      {!loading && visibleDepartments.length === 0 && <EmptyState text="No departments found." />}
    </>
  )
}
