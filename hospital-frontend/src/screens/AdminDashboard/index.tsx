import type {
  ChangeScheduleInput,
  CreateScheduleInput,
  DepartmentDto,
  DoctorDto,
  ScheduleDto,
  UserDto,
  UserRole,
} from '../../api'
import { EmptyState, Metric, PageHint, StatusBadge } from '../../components/ui'
import { adminTitle, formatTime, initials } from '../../lib/format'
import type { ActivityEntry, AdminSection, Screen } from '../../types'
import { DepartmentsTab } from './DepartmentsTab'
import { DoctorsTab } from './DoctorsTab'
import { SchedulesTab } from './SchedulesTab'
import { UsersTab } from './UsersTab'

export function AdminDashboard({
  departments,
  doctors,
  loading,
  schedules,
  selectedDepartment,
  selectedDepartmentId,
  section,
  searchQuery,
  isReadOnly,
  activity,
  users,
  onAssignDoctor,
  onChangeDepartmentStatus,
  onChangeDoctorStatus,
  onChangeSchedule,
  onChangeUserRole,
  onCreateDepartment,
  onCreateSchedule,
  onCreateUser,
  onNavigate,
  onResetPassword,
  onSelectDepartment,
}: {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  loading: boolean
  schedules: ScheduleDto[]
  selectedDepartment: DepartmentDto | null
  selectedDepartmentId: number | null
  section: AdminSection
  searchQuery: string
  isReadOnly: boolean
  activity: ActivityEntry[]
  users: UserDto[]
  onAssignDoctor: (doctorId: number, departmentId: number) => Promise<void>
  onChangeDepartmentStatus: (departmentId: number, isActive: boolean) => Promise<void>
  onChangeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<void>
  onChangeSchedule: (input: ChangeScheduleInput) => Promise<void>
  onChangeUserRole: (userId: number, role: UserRole) => Promise<void>
  onCreateDepartment: (name: string) => Promise<void>
  onCreateSchedule: (input: CreateScheduleInput) => Promise<void>
  onCreateUser: (name: string, password: string) => Promise<void>
  onNavigate: (screen: Screen) => void
  onResetPassword: (userId: number, password: string) => Promise<void>
  onSelectDepartment: (departmentId: number) => void
}) {
  const selectedDoctors = selectedDepartment
    ? doctors.filter((doctor) => doctor.departmentId === selectedDepartment.id)
    : []

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
            departments={departments}
            doctors={doctors}
            schedules={schedules}
            loading={loading}
            searchQuery={searchQuery}
            selectedDepartmentId={selectedDepartmentId}
            isReadOnly={isReadOnly}
            onChangeDepartmentStatus={onChangeDepartmentStatus}
            onCreateDepartment={onCreateDepartment}
            onSelectDepartment={onSelectDepartment}
          />
        )}

        {section === 'doctors' && (
          <DoctorsTab
            departments={departments}
            doctors={doctors}
            loading={loading}
            searchQuery={searchQuery}
            isReadOnly={isReadOnly}
            onAssignDoctor={onAssignDoctor}
            onChangeDoctorStatus={onChangeDoctorStatus}
          />
        )}

        {section === 'schedules' && (
          <SchedulesTab
            schedules={schedules}
            doctors={doctors}
            loading={loading}
            searchQuery={searchQuery}
            isReadOnly={isReadOnly}
            onChangeSchedule={onChangeSchedule}
            onCreateSchedule={onCreateSchedule}
          />
        )}

        {section === 'users' && (
          <UsersTab
            users={users}
            loading={loading}
            searchQuery={searchQuery}
            isReadOnly={isReadOnly}
            onChangeUserRole={onChangeUserRole}
            onCreateUser={onCreateUser}
            onResetPassword={onResetPassword}
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
          <Metric label="Schedules" value={schedules.length} tone="green" />
          <Metric label="Users" value={users.length} tone="blue" />
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
