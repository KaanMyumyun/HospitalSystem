import type { DoctorDto } from '../../api'
import { GuardedButton, StatusBadge, TableStatus } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { guarded } from '../../lib/readOnly'
import { departmentName } from '../../lib/format'
import type { ActionOutcome } from '../../types'

export function DoctorsTab({
  onAssignDoctor,
  onChangeDoctorStatus,
}: {
  onAssignDoctor: (doctor: DoctorDto, departmentId: number) => Promise<ActionOutcome>
  onChangeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<ActionOutcome>
}) {
  const { departments, doctors, loading, searchQuery, isReadOnly } = useWorkspace()
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
                  aria-label={`Department of ${doctor.name}`}
                  className="table-select"
                  {...guarded(isReadOnly, loading)}
                  value={doctor.departmentId}
                  onChange={(event) => void onAssignDoctor(doctor, Number(event.target.value))}
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
                <GuardedButton
                  className="secondary-button compact-action"
                  readOnly={isReadOnly}
                  disabled={loading}
                  onClick={() => void onChangeDoctorStatus(doctor, !doctor.isActive)}
                >
                  {doctor.isActive ? 'Deactivate' : 'Activate'}
                </GuardedButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableStatus loading={loading} empty={visibleDoctors.length === 0} emptyText="No doctors found." />
    </>
  )
}
