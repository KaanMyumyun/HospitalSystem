import { useMemo } from 'react'
import type { DepartmentDto, DoctorDto } from '../../api'
import { EmptyState, StatusBadge } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { departmentName, initials } from '../../lib/format'

export function DoctorPicker({
  activeDepartments,
  departmentFilter,
  doctors,
  selectedDoctorId,
  onDepartmentFilterChange,
  onSelectDoctor,
}: {
  activeDepartments: DepartmentDto[]
  departmentFilter: number | 'all'
  doctors: DoctorDto[]
  selectedDoctorId: number | null
  onDepartmentFilterChange: (filter: number | 'all') => void
  onSelectDoctor: (doctorId: number) => void
}) {
  const workspace = useWorkspace()
  const activeDepartmentIds = useMemo(
    () => new Set(activeDepartments.map((department) => department.id)),
    [activeDepartments],
  )
  const activeDoctors = workspace.doctors.filter(
    (doctor) => doctor.isActive && activeDepartmentIds.has(doctor.departmentId),
  )

  return (
    <aside className="panel doctor-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Filters</p>
          <h2>Doctors</h2>
        </div>
      </div>

      <div className="section-label">Departments</div>
      <div className="department-picker">
        <button
          className={`department-pill ${departmentFilter === 'all' ? 'active' : ''}`}
          type="button"
          onClick={() => onDepartmentFilterChange('all')}
        >
          <strong>All</strong>
          <span>{activeDoctors.length} doctors</span>
        </button>
        {activeDepartments.map((department) => (
          <button
            className={`department-pill ${departmentFilter === department.id ? 'active' : ''}`}
            type="button"
            key={department.id}
            onClick={() => onDepartmentFilterChange(department.id)}
          >
            <strong>{department.name}</strong>
            <span>{activeDoctors.filter((doctor) => doctor.departmentId === department.id).length} doctors</span>
          </button>
        ))}
      </div>

      <div className="doctor-list">
        {doctors.map((doctor) => (
          <button
            className={`doctor-card ${doctor.doctorId === selectedDoctorId ? 'selected' : ''}`}
            type="button"
            key={doctor.doctorId}
            onClick={() => onSelectDoctor(doctor.doctorId)}
          >
            <span className="doctor-avatar">{initials(doctor.name)}</span>
            <span>
              <strong>{doctor.name}</strong>
              <small>{departmentName(workspace.departments, doctor.departmentId)}</small>
            </span>
            <StatusBadge tone="success">Active</StatusBadge>
          </button>
        ))}
        {!workspace.loading && doctors.length === 0 && <EmptyState text="No active doctors returned by the API." />}
      </div>
    </aside>
  )
}
