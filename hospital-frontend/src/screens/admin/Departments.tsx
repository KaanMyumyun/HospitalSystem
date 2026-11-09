import { useMemo, useState } from 'react'
import { changeDepartmentStatus, createDepartment } from '../../api/client'
import type { DepartmentDto } from '../../api/client'
import { useWorkspace } from '../../app/workspaceContext'
import { formatHourRange, formatWorkingDays } from '../../lib/format'
import { departmentHue, personName } from '../../lib/names'
import { clockLabel, scheduleWindow } from '../../lib/time'
import type { ScreenProps } from '../../shell/Shell'
import { Button } from '../../ui/Button'
import { DeptDot, Empty, LoadError, Skeleton, Switch } from '../../ui/bits'
import { Dialog } from '../../ui/Dialog'
import { Field, FormError } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { PageHead, SearchField } from '../../ui/Page'
import { readOnlyReason } from '../../ui/Button'
import './admin.css'

export function Departments(_props: ScreenProps) {
  const { data, dataReady, dataError, readOnly, refresh, runBookingChange, confirm, scheduleOf, go } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const departments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...data.departments]
      .filter((department) => !needle || department.name.toLowerCase().includes(needle))
      .sort((left, right) => Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name))
  }, [data.departments, query])

  const toggle = async (department: DepartmentDto, isActive: boolean) => {
    const ok = await confirm({
      eyebrow: department.name,
      title: isActive ? 'Open it for bookings?' : 'Stop bookings here?',
      message: isActive
        ? 'Its active doctors can be booked again straight away.'
        : 'Its doctors disappear from reception. If anyone is booked ahead, you will see who before anything changes.',
      confirmLabel: isActive ? 'Open for bookings' : 'Stop bookings',
      tone: isActive ? undefined : 'danger',
    })
    if (!ok) return
    await runBookingChange(
      (cancel) => changeDepartmentStatus(department.id, isActive, cancel),
      isActive ? `${department.name} takes bookings again` : `${department.name} no longer takes bookings`,
    )
  }

  const openCount = data.departments.filter((department) => department.isActive).length

  return (
    <div className="page">
      <PageHead
        actions={
          <Button icon="plus" locked={readOnly} variant="primary" onClick={() => setCreating(true)}>
            New department
          </Button>
        }
        lede="The service lines patients are booked under. Closing one takes its doctors out of reception without losing anything."
        title="Departments"
      />
      <div className="page-toolbar">
        <SearchField className="toolbar-search" label="Find a department" placeholder="Find a department" value={query} onChange={setQuery} />
        <span className="toolbar-count num">
          {data.departments.length} departments · {openCount} open
        </span>
      </div>
      <div className="page-body">
        {dataError && !dataReady ? (
          <LoadError message={dataError} onRetry={() => void refresh()} />
        ) : !dataReady ? (
          <Skeleton lines={7} />
        ) : departments.length === 0 ? (
          <Empty title={query ? 'No department matches that' : 'No departments yet'}>
            {query ? 'Try a shorter name.' : 'Create the first one to start adding doctors.'}
          </Empty>
        ) : (
          <ul className="dept-list">
            {departments.map((department) => {
              const doctors = data.doctors
                .filter((doctor) => doctor.departmentId === department.id)
                .sort((left, right) => personName(left.name).localeCompare(personName(right.name)))
              const bookable = doctors.filter((doctor) => doctor.isActive).length
              const spans = doctors.flatMap((doctor) => {
                const schedule = scheduleOf(doctor.doctorId)
                return schedule ? [scheduleWindow(schedule)] : []
              })
              const hours =
                spans.length > 0
                  ? `${clockLabel(Math.min(...spans.map((span) => span.startMinutes)))}–${clockLabel(Math.max(...spans.map((span) => span.endMinutes)))}`
                  : null
              const expanded = open === department.id
              return (
                <li className={`dept${department.isActive ? '' : ' is-inactive'}${expanded ? ' is-open' : ''}`} key={department.id}>
                  <div className="dept-row">
                    <button
                      aria-expanded={expanded}
                      className="dept-toggle"
                      type="button"
                      onClick={() => setOpen(expanded ? null : department.id)}
                    >
                      <DeptDot hue={departmentHue(department.id)} size={10} />
                      <span className="dept-name">{department.name}</span>
                      <Icon className="dept-chevron" name="chevron-down" size={16} />
                    </button>
                    <span className="dept-stat">
                      {doctors.length === 0 ? 'No doctors' : `${doctors.length} ${doctors.length === 1 ? 'doctor' : 'doctors'}`}
                      {doctors.length > 0 && bookable !== doctors.length && <span className="muted"> · {bookable} active</span>}
                    </span>
                    <span className="dept-hours mono">{hours ?? '—'}</span>
                    <span className="dept-switch">
                      <span className="dept-switch-label">{department.isActive ? 'Open' : 'Closed'}</span>
                      <Switch
                        checked={department.isActive}
                        disabled={readOnly}
                        label={`${department.name} takes bookings`}
                        title={readOnly ? readOnlyReason : undefined}
                        onChange={(value) => void toggle(department, value)}
                      />
                    </span>
                  </div>
                  {expanded && (
                    <div className="dept-detail">
                      {doctors.length === 0 ? (
                        <p className="muted">
                          No doctors yet. Give a user the Doctor role under Users and pick this department.
                        </p>
                      ) : (
                        <ul className="dept-doctors">
                          {doctors.map((doctor) => {
                            const schedule = scheduleOf(doctor.doctorId)
                            return (
                              <li key={doctor.doctorId}>
                                <span className="dept-doctor-name">{personName(doctor.name)}</span>
                                <span className="dept-doctor-hours">
                                  {schedule ? (
                                    <>
                                      <span className="mono">{formatHourRange(schedule).replace('-', '–')}</span> ·{' '}
                                      {formatWorkingDays(schedule.workingDays).replace('-', '–')}
                                    </>
                                  ) : (
                                    <span className="muted">No schedule</span>
                                  )}
                                </span>
                                <span className={doctor.isActive ? 'tag tag-accent' : 'tag'}>
                                  {doctor.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      <div className="btn-row btn-row-start">
                        <Button iconAfter="arrow-right" size="sm" variant="ghost" onClick={() => go('doctors', { department: department.id })}>
                          Doctors
                        </Button>
                        <Button iconAfter="arrow-right" size="sm" variant="ghost" onClick={() => go('schedules')}>
                          Schedules
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {creating && <NewDepartmentDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewDepartmentDialog({ onClose }: { onClose: () => void }) {
  const { run, busy, readOnly, data } = useWorkspace()
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()
  const taken = data.departments.some((department) => department.name.toLowerCase() === trimmed.toLowerCase())
  const problem =
    trimmed.length < 3 ? 'Use at least 3 characters' : trimmed.length > 100 ? 'Use 100 characters or fewer' : taken ? 'There is already a department with that name' : null

  const submit = async () => {
    setTried(true)
    if (problem) return
    const outcome = await run(() => createDepartment(trimmed), `${trimmed} created`, { quiet: true })
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <Dialog
      description="It opens for bookings as soon as it has a doctor with working hours."
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} locked={readOnly} type="submit" variant="primary">
            Create department
          </Button>
        </>
      }
      size="sm"
      title="New department"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field error={tried ? problem : null} label="Name">
        {(control) => (
          <input
            {...control}
            className="input"
            maxLength={100}
            placeholder="For example, Dermatology"
            value={name}
            onChange={(event) => {
              setError(null)
              setName(event.target.value)
            }}
          />
        )}
      </Field>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}
