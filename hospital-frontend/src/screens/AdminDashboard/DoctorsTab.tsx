import type { DepartmentDto, DoctorDto } from '../../api'
import { EmptyState, SkeletonRows, StatusBadge } from '../../components/ui'
import { departmentName } from '../../lib/format'
import type { ActionOutcome } from '../../types'

export function DoctorsTab({
  departments,
  doctors,
  loading,
  searchQuery,
  isReadOnly,
  onAssignDoctor,
  onChangeDoctorStatus,
}: {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  loading: boolean
  searchQuery: string
  isReadOnly: boolean
  onAssignDoctor: (doctorId: number, departmentId: number) => Promise<ActionOutcome>
  onChangeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<ActionOutcome>
}) {
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDoctors = doctors.filter(
    (doctor) =>
      !normalizedSearch ||
      doctor.name.toLowerCase().includes(normalizedSearch) ||
      departmentName(departments, doctor.departmentId).toLowerCase().includes(normalizedSearch),
  )

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Status</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleDoctors.map((doctor) => (
            <tr key={doctor.doctorId}>
              <td><strong>{doctor.name}</strong></td>
              <td><StatusBadge tone={doctor.isActive ? 'success' : 'muted'}>{doctor.isActive ? 'Active' : 'Inactive'}</StatusBadge></td>
              <td>
                <select
                  className="table-select"
                  disabled={isReadOnly || loading}
                  title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                  value={doctor.departmentId}
                  onChange={(event) => void onAssignDoctor(doctor.doctorId, Number(event.target.value))}
                >
                  {/* Doctors can only be moved into active departments; an inactive
                      current department is still listed so the select shows it. */}
                  {departments
                    .filter((department) => department.isActive || department.id === doctor.departmentId)
                    .map((department) => (
                      <option disabled={!department.isActive} key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </td>
              <td>
                <button
                  className="secondary-button compact-action"
                  disabled={isReadOnly || loading}
                  title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                  type="button"
                  onClick={() => void onChangeDoctorStatus(doctor, !doctor.isActive)}
                >
                  {doctor.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <SkeletonRows count={5} />}
      {!loading && visibleDoctors.length === 0 && <EmptyState text="No doctors found." />}
    </>
  )
}
