import { useMemo, useState } from 'react'
import type { DoctorDto, ScheduleDto } from '../../api/client'
import { useWorkspace } from '../../app/workspaceContext'
import { formatHourRange } from '../../lib/format'
import { departmentHue, personName } from '../../lib/names'
import { dayName, isAway } from '../../lib/schedule'
import { clinicDate, clinicDayStart } from '../../lib/clinicTime'
import { weekdayShort } from '../../lib/dates'
import { DeptDot } from '../../ui/bits'
import { IconButton } from '../../ui/Button'
import { Icon } from '../../ui/Icon'

function backOn(schedule: ScheduleDto, today: Date) {
  for (let offset = 1; offset <= 14; offset++) {
    const day = clinicDayStart(today, offset)
    if (schedule.workingDays.includes(dayName(day)) && !isAway(schedule, clinicDate(day))) {
      return offset === 1 ? ' · back tomorrow' : ` · back ${weekdayShort(day)}`
    }
  }
  return ''
}

export function DoctorList({
  doctors,
  selectedId,
  now,
  onSelect,
}: {
  doctors: DoctorDto[]
  selectedId: number | null
  now: number
  onSelect: (doctorId: number) => void
}) {
  const { departmentOf, scheduleOf } = useWorkspace()
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const byDepartment = new Map<number, DoctorDto[]>()
    for (const doctor of doctors) {
      const department = departmentOf(doctor.departmentId)
      const haystack = `${personName(doctor.name)} ${doctor.name} ${department?.name ?? ''}`.toLowerCase()
      if (!words.every((word) => haystack.includes(word))) continue
      const list = byDepartment.get(doctor.departmentId) ?? []
      list.push(doctor)
      byDepartment.set(doctor.departmentId, list)
    }
    return Array.from(byDepartment, ([departmentId, list]) => ({
      department: departmentOf(departmentId),
      departmentId,
      doctors: list.sort((left, right) => personName(left.name).localeCompare(personName(right.name))),
    })).sort((left, right) => (left.department?.name ?? '').localeCompare(right.department?.name ?? ''))
  }, [doctors, query, departmentOf])

  const today = new Date(now)
  const todayDate = clinicDate(today)
  const todayName = dayName(today)

  return (
    <div className="doctor-list">
      <label className="search-input doctor-search">
        <Icon name="search" size={16} />
        <span className="visually-hidden">Find a doctor</span>
        <input
          className="input input-sm"
          placeholder="Find a doctor"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <IconButton className="search-clear" icon="close" label="Clear" size="sm" onClick={() => setQuery('')} />}
      </label>

      {groups.map((group) => (
        <section className="doctor-group" key={group.departmentId}>
          <h2 className="doctor-group-title">
            <DeptDot hue={departmentHue(group.departmentId)} />
            <span>{group.department?.name ?? 'Unassigned'}</span>
            <span className="doctor-group-count">{group.doctors.length}</span>
          </h2>
          <ul>
            {group.doctors.map((doctor) => {
              const schedule = scheduleOf(doctor.doctorId)
              let state: { text: string; tone?: 'away' | 'off' | 'none' }
              if (!schedule) state = { text: 'No schedule yet', tone: 'none' }
              else if (isAway(schedule, todayDate)) state = { text: `Away today${backOn(schedule, today)}`, tone: 'away' }
              else if (!schedule.workingDays.includes(todayName)) state = { text: `Off today${backOn(schedule, today)}`, tone: 'off' }
              else state = { text: `Today ${formatHourRange(schedule).replace('-', '–')}` }
              const selected = doctor.doctorId === selectedId
              return (
                <li key={doctor.doctorId}>
                  <button
                    aria-current={selected ? 'true' : undefined}
                    className="doctor-item"
                    type="button"
                    onClick={() => onSelect(doctor.doctorId)}
                  >
                    <span className="doctor-item-name">{personName(doctor.name)}</span>
                    <span className={`doctor-item-state${state.tone ? ` is-${state.tone}` : ''}`}>{state.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {groups.length === 0 && (
        <p className="doctor-list-empty">
          {doctors.length === 0 ? 'No doctors can be booked right now.' : 'No doctor matches that.'}
        </p>
      )}
    </div>
  )
}
