import type { UsersPage } from '../../api'
import { EmptyState, Metric, PageHint, StatusBadge } from '../../components/ui'
import type { AdminActions } from '../../hooks/useAdminActions'
import { useWorkspace } from '../../hooks/useWorkspace'
import { adminTitle, formatTime, initials } from '../../lib/format'
import type { ActivityEntry, AdminSection, Screen } from '../../types'
import { AuditLogTab } from './AuditLogTab'
import { DepartmentsTab } from './DepartmentsTab'
import { DoctorsTab } from './DoctorsTab'
import { SchedulesTab } from './SchedulesTab'
import { UsersTab } from './UsersTab'

export function AdminDashboard({
  section,
  selectedDepartmentId,
  activity,
  usersPage,
  usersLoading,
  canReadAuditLog,
  actions,
  onNavigate,
  onSelectDepartment,
  onUsersPageChange,
}: {
  section: AdminSection
  // Null until one is chosen; the inspector shows the first department then.
  selectedDepartmentId: number | null
  activity: ActivityEntry[]
  usersPage: UsersPage | null
  usersLoading: boolean
  // Admins only: entries name users, which demo admins may not see.
  canReadAuditLog: boolean
  actions: AdminActions
  onNavigate: (screen: Screen) => void
  onSelectDepartment: (departmentId: number) => void
  onUsersPageChange: (page: number) => void
}) {
  const { departments, doctors, schedules, loading } = useWorkspace()
  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) ?? departments[0] ?? null
  const selectedDoctors = selectedDepartment
    ? doctors.filter((doctor) => doctor.departmentId === selectedDepartment.id)
    : []
  const selectedSchedules = schedules.filter((schedule) =>
    selectedDoctors.some((doctor) => doctor.doctorId === schedule.doctorId),
  )

  return (
    <section className="screen-grid admin-grid">
      <section className="panel table-panel">
        <div className="panel-heading page-heading">
          <div>
            <p className="eyebrow">Management</p>
            <h2>{adminTitle(section)}</h2>
          </div>
          <PageHint section={section} />
        </div>

        {section === 'departments' && (
          <DepartmentsTab
            selectedDepartmentId={selectedDepartmentId}
            onChangeDepartmentStatus={actions.changeDepartmentStatus}
            onCreateDepartment={actions.createDepartment}
            onSelectDepartment={onSelectDepartment}
          />
        )}

        {section === 'doctors' && (
          <DoctorsTab onAssignDoctor={actions.assignDoctor} onChangeDoctorStatus={actions.changeDoctorStatus} />
        )}

        {section === 'schedules' && (
          <SchedulesTab
            onAddTimeOff={actions.addTimeOff}
            onChangeSchedule={actions.changeSchedule}
            onCreateSchedule={actions.createSchedule}
            onRemoveTimeOff={actions.removeTimeOff}
          />
        )}

        {section === 'audit' && <AuditLogTab enabled={canReadAuditLog} />}

        {section === 'users' && (
          <UsersTab
            usersPage={usersPage}
            loading={loading || usersLoading}
            onChangeUserRole={actions.changeUserRole}
            onCreateUser={actions.createUser}
            onPageChange={onUsersPageChange}
            onResetPassword={actions.resetPassword}
          />
        )}
      </section>

      <aside className="panel inspector-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inspector</p>
            <h2>{selectedDepartment?.name ?? 'Select department'}</h2>
          </div>
          <StatusBadge tone={selectedDepartment?.isActive ? 'success' : 'muted'}>
            {selectedDepartment?.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        </div>

        <div className="inspector-stats">
          <Metric label="Doctors" value={selectedDoctors.length} tone="blue" />
          <Metric label="Active" value={selectedDoctors.filter((doctor) => doctor.isActive).length} tone="green" />
          <Metric label="Schedules" value={selectedSchedules.length} tone="blue" />
        </div>

        <div className="section-label">Doctors</div>
        <div className="compact-list">
          {selectedDoctors.map((doctor) => (
            <div className="compact-row" key={doctor.doctorId}>
              <span className="doctor-avatar">{initials(doctor.name)}</span>
              <div>
                <strong>{doctor.name}</strong>
                <small>{doctor.isActive ? 'Active' : 'Inactive'}</small>
              </div>
            </div>
          ))}
          {!loading && selectedDoctors.length === 0 && <EmptyState text="No doctors assigned here." />}
        </div>

        <div className="stack">
          <button className="primary-button" type="button" onClick={() => onNavigate('doctors')}>
            Assign Doctor
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('schedules')}>
            Edit Schedule
          </button>
        </div>

        <div className="section-label activity-label">Recent activity</div>
        <div className="activity-list">
          {activity.map((entry) => (
            <div className="activity-row" key={entry.id}>
              <strong>{entry.message}</strong>
              <small>{formatTime(new Date(entry.at))}</small>
            </div>
          ))}
          {activity.length === 0 && <EmptyState text="No actions recorded in this browser yet." />}
        </div>
      </aside>
    </section>
  )
}
