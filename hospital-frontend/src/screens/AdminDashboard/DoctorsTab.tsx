import type { DepartmentDto, DoctorDto } from '../../api'
import { EmptyState, SkeletonRows, StatusBadge } from '../../components/ui'
import { departmentName } from '../../lib/format'

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
  onAssignDoctor: (doctorId: number, departmentId: number) => Promise<void>
  onChangeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<void>
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
                  disabled={isReadOnly}
                  title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                  value={doctor.departmentId}
                  onChange={(event) => void onAssignDoctor(doctor.doctorId, Number(event.target.value))}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="secondary-button compact-action"
                  disabled={isReadOnly}
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
