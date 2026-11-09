import { useMemo, useState } from 'react'
import { changeDoctorDepartment, changeDoctorStatus } from '../../api/client'
import type { DoctorDto } from '../../api/client'
import { useWorkspace } from '../../app/workspaceContext'
import { formatHourRange, formatWorkingDays } from '../../lib/format'
import { departmentHue, personName } from '../../lib/names'
import type { ScreenProps } from '../../shell/Shell'
import { Button, readOnlyReason } from '../../ui/Button'
import { DeptDot, Empty, LoadError, Segmented, Skeleton, Switch } from '../../ui/bits'
import { Select } from '../../ui/Field'
import { PageHead, SearchField } from '../../ui/Page'
import './admin.css'

type StatusFilter = 'all' | 'active' | 'inactive'

export function Doctors({ params }: ScreenProps) {
  const { data, dataReady, dataError, readOnly, refresh, run, runBookingChange, confirm, departmentOf, scheduleOf, go } =
    useWorkspace()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState<number | 'all'>(() => Number(params.get('department')) || 'all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const doctors = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return data.doctors
      .filter((doctor) => department === 'all' || doctor.departmentId === department)
      .filter((doctor) => status === 'all' || (status === 'active') === doctor.isActive)
      .filter((doctor) => {
        const haystack = `${personName(doctor.name)} ${doctor.name} ${departmentOf(doctor.departmentId)?.name ?? ''}`.toLowerCase()
        return words.every((word) => haystack.includes(word))
      })
      .sort((left, right) => personName(left.name).localeCompare(personName(right.name)))
  }, [data.doctors, department, status, query, departmentOf])

  const move = async (doctor: DoctorDto, departmentId: number) => {
    const target = departmentOf(departmentId)
    const ok = await confirm({
      eyebrow: personName(doctor.name),
      title: `Move to ${target?.name ?? 'this department'}?`,
      message: 'Their schedule and bookings stay as they are. Reception lists them under the new department.',
      confirmLabel: 'Move doctor',
    })
    if (!ok) return
    await run(() => changeDoctorDepartment(doctor.doctorId, departmentId), `${personName(doctor.name)} moved to ${target?.name}`)
  }

  const setActive = async (doctor: DoctorDto, isActive: boolean) => {
    const ok = await confirm({
      eyebrow: personName(doctor.name),
      title: isActive ? 'Make bookable again?' : 'Stop booking this doctor?',
      message: isActive
        ? 'They can sign in and be booked again.'
        : 'They are signed out and disappear from reception. If anyone is booked ahead, you will see who before anything changes.',
      confirmLabel: isActive ? 'Make bookable' : 'Stop bookings',
      tone: isActive ? undefined : 'danger',
    })
    if (!ok) return
    await runBookingChange(
      (cancel) => changeDoctorStatus(doctor, isActive, cancel),
      isActive ? `${personName(doctor.name)} can be booked again` : `${personName(doctor.name)} can no longer be booked`,
    )
  }

  const departments = [...data.departments].sort((left, right) => left.name.localeCompare(right.name))

  return (
    <div className="page">
      <PageHead
        actions={
          <Button iconAfter="arrow-right" onClick={() => go('users')}>
            Add a doctor in Users
          </Button>
        }
        lede="Who can be booked, and in which department. A new doctor starts as a user account that is given the Doctor role."
        title="Doctors"
      />
      <div className="page-toolbar">
        <SearchField className="toolbar-search" label="Find a doctor" placeholder="Find a doctor" value={query} onChange={setQuery} />
        <Select
          aria-label="Department"
          className="toolbar-select"
          value={department}
          onChange={(event) => setDepartment(event.target.value === 'all' ? 'all' : Number(event.target.value))}
        >
          <option value="all">All departments</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Segmented
          label="Status"
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
      <div className="page-body">
        {dataError && !dataReady ? (
          <LoadError message={dataError} onRetry={() => void refresh()} />
        ) : !dataReady ? (
          <Skeleton lines={8} />
        ) : doctors.length === 0 ? (
          <Empty title="No doctor matches">Clear the search or pick another department.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">Doctor</th>
                  <th scope="col">Department</th>
                  <th scope="col">Working hours</th>
                  <th className="align-end" scope="col">
                    Bookable
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => {
                  const schedule = scheduleOf(doctor.doctorId)
                  const current = departmentOf(doctor.departmentId)
                  return (
                    <tr className={doctor.isActive ? undefined : 'is-muted'} key={doctor.doctorId}>
                      <td>
                        <span className="person-name">{personName(doctor.name)}</span>
                        <span className="person-handle mono">{doctor.name}</span>
                      </td>
                      <td>
                        <span className="dept-cell">
                          <DeptDot hue={departmentHue(doctor.departmentId)} />
                          <Select
                            aria-label={`Department of ${personName(doctor.name)}`}
                            className="select-sm select-inline"
                            disabled={readOnly}
                            title={readOnly ? readOnlyReason : undefined}
                            value={doctor.departmentId}
                            onChange={(event) => void move(doctor, Number(event.target.value))}
                          >
                            {departments
                              .filter((item) => item.isActive || item.id === doctor.departmentId)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                  {item.isActive ? '' : ' (closed)'}
                                </option>
                              ))}
                          </Select>
                        </span>
                        {current && !current.isActive && <span className="cell-note">Department is closed</span>}
                      </td>
                      <td>
                        {schedule ? (
                          <span className="hours-cell">
                            <span className="mono">{formatHourRange(schedule).replace('-', '–')}</span>
                            <span className="muted">{formatWorkingDays(schedule.workingDays).replace('-', '–')}</span>
                          </span>
                        ) : (
                          <button className="link-btn" type="button" onClick={() => go('schedules', { doctor: doctor.doctorId })}>
                            Set working hours
                          </button>
                        )}
                      </td>
                      <td className="align-end">
                        <Switch
                          checked={doctor.isActive}
                          disabled={readOnly}
                          label={`${personName(doctor.name)} can be booked`}
                          title={readOnly ? readOnlyReason : undefined}
                          onChange={(value) => void setActive(doctor, value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
