import { useMemo, useState } from 'react'
import type { AddTimeOffInput, ChangeScheduleInput, CreateScheduleInput, DayOfWeek, ScheduleDto, TimeOffDto } from '../../api'
import { GuardedButton, TableStatus } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { formatBreak, formatTimeOff, formatWorkingDays } from '../../lib/format'
import { filterBySearch } from '../../lib/search'
import { clockLabel, scheduleWindow } from '../../lib/time'
import { todayInputValue } from '../../lib/validation'
import type { ActionOutcome } from '../../types'

const weekOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const mondayToFriday = weekOrder.slice(0, 5)

export function SchedulesTab({
  onAddTimeOff,
  onChangeSchedule,
  onCreateSchedule,
  onRemoveTimeOff,
}: {
  onAddTimeOff: (scheduleId: number, input: AddTimeOffInput) => Promise<ActionOutcome>
  onChangeSchedule: (scheduleId: number, input: ChangeScheduleInput) => Promise<ActionOutcome>
  onCreateSchedule: (input: CreateScheduleInput) => Promise<ActionOutcome>
  onRemoveTimeOff: (scheduleId: number, timeOff: TimeOffDto, doctorName: string) => Promise<ActionOutcome>
}) {
  const { schedules, departments, doctors, loading, searchQuery, isReadOnly } = useWorkspace()
  const [scheduleDoctorId, setScheduleDoctorId] = useState<number | ''>('')
  const [scheduleStartHour, setScheduleStartHour] = useState('8')
  const [scheduleEndHour, setScheduleEndHour] = useState('16')
  const [scheduleSlotDuration, setScheduleSlotDuration] = useState('15')
  const [scheduleDays, setScheduleDays] = useState<DayOfWeek[]>(mondayToFriday)
  const [scheduleBreak, setScheduleBreak] = useState<BreakInput>(noBreak)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editStartHour, setEditStartHour] = useState('')
  const [editEndHour, setEditEndHour] = useState('')
  const [editSlotDuration, setEditSlotDuration] = useState('')
  const [editDays, setEditDays] = useState<DayOfWeek[]>([])
  const [editBreak, setEditBreak] = useState<BreakInput>(noBreak)

  const visibleSchedules = useMemo(
    () =>
      filterBySearch(schedules, searchQuery, (schedule) => [
        doctors.find((doctor) => doctor.doctorId === schedule.doctorId)?.name,
      ]),
    [doctors, schedules, searchQuery],
  )

  const schedulableDoctors = doctors.filter(
    (doctor) =>
      doctor.isActive &&
      departments.some((department) => department.id === doctor.departmentId && department.isActive) &&
      !schedules.some((schedule) => schedule.doctorId === doctor.doctorId),
  )

  const scheduleInput = (): CreateScheduleInput => ({
    doctorId: Number(scheduleDoctorId),
    startHour: Number(scheduleStartHour),
    endHour: Number(scheduleEndHour),
    slotDurationMin: Number(scheduleSlotDuration),
    workingDays: scheduleDays,
    ...breakMinutes(scheduleBreak),
  })
  const startScheduleEdit = (schedule: ScheduleDto) => {
    setEditingScheduleId(schedule.scheduleId)
    const { startMinutes, endMinutes } = scheduleWindow(schedule)
    setEditStartHour(String(startMinutes / 60))
    setEditEndHour(String(endMinutes / 60))
    setEditSlotDuration(String(schedule.slotDurationMin))
    setEditDays(schedule.workingDays)
    setEditBreak({
      start: schedule.breakStartMinute == null ? '' : clockLabel(schedule.breakStartMinute),
      end: schedule.breakEndMinute == null ? '' : clockLabel(schedule.breakEndMinute),
    })
  }
  const doctorNameFor = (schedule: ScheduleDto) =>
    doctors.find((item) => item.doctorId === schedule.doctorId)?.name ?? `Doctor ${schedule.doctorId}`

  return (
    <>
      <div className="inline-form schedule-form">
        <label>
          Doctor
          <select value={scheduleDoctorId} onChange={(event) => setScheduleDoctorId(Number(event.target.value))}>
            <option value="">Select doctor</option>
            {schedulableDoctors.map((doctor) => (
              <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name}</option>
            ))}
          </select>
        </label>
        <label>
          Start
          <input aria-label="Start hour" type="number" min="0" max="23" value={scheduleStartHour} onChange={(event) => setScheduleStartHour(event.target.value)} />
        </label>
        <label>
          End
          <input aria-label="End hour" type="number" min="1" max="24" value={scheduleEndHour} onChange={(event) => setScheduleEndHour(event.target.value)} />
        </label>
        <label>
          Slot
          <input aria-label="Slot duration" type="number" min="5" step="5" value={scheduleSlotDuration} onChange={(event) => setScheduleSlotDuration(event.target.value)} />
        </label>
        <BreakPicker label="Break" value={scheduleBreak} onChange={setScheduleBreak} />
        <DayPicker label="Working days" days={scheduleDays} onChange={setScheduleDays} />
        <GuardedButton
          className="secondary-button"
          readOnly={isReadOnly}
          disabled={
            !scheduleDoctorId ||
            Number(scheduleStartHour) >= Number(scheduleEndHour) ||
            scheduleDays.length === 0 ||
            !isBreakComplete(scheduleBreak) ||
            loading
          }
          onClick={async () => {
            if ((await onCreateSchedule(scheduleInput())).ok) {
              setScheduleDoctorId('')
              setScheduleBreak(noBreak)
            }
          }}
        >
          Create Schedule
        </GuardedButton>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Start</th>
            <th>End</th>
            <th>Slot</th>
            <th>Break</th>
            <th>Days</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleSchedules.map((schedule) => {
            const doctorName = doctorNameFor(schedule)
            return (
              <tr key={schedule.scheduleId}>
                <td><strong>{doctorName}</strong></td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input aria-label={`Start hour for ${doctorName}`} className="table-input" type="number" min="0" max="23" value={editStartHour} onChange={(event) => setEditStartHour(event.target.value)} />
                  ) : (
                    clockLabel(scheduleWindow(schedule).startMinutes)
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input aria-label={`End hour for ${doctorName}`} className="table-input" type="number" min="1" max="24" value={editEndHour} onChange={(event) => setEditEndHour(event.target.value)} />
                  ) : (
                    clockLabel(scheduleWindow(schedule).endMinutes)
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input aria-label={`Slot minutes for ${doctorName}`} className="table-input" type="number" min="5" step="5" value={editSlotDuration} onChange={(event) => setEditSlotDuration(event.target.value)} />
                  ) : (
                    `${schedule.slotDurationMin} min`
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <BreakPicker label={`Break for ${doctorName}`} hideLabel value={editBreak} onChange={setEditBreak} />
                  ) : (
                    formatBreak(schedule) ?? 'None'
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <DayPicker label={`Working days for ${doctorName}`} days={editDays} onChange={setEditDays} />
                  ) : (
                    formatWorkingDays(schedule.workingDays)
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <div className="table-actions">
                      <GuardedButton
                        className="secondary-button compact-action"
                        readOnly={isReadOnly}
                        disabled={
                          Number(editStartHour) >= Number(editEndHour) ||
                          editDays.length === 0 ||
                          !isBreakComplete(editBreak) ||
                          loading
                        }
                        onClick={async () => {
                          const outcome = await onChangeSchedule(schedule.scheduleId, {
                            startHour: Number(editStartHour),
                            endHour: Number(editEndHour),
                            slotDurationMin: Number(editSlotDuration),
                            workingDays: editDays,
                            ...breakMinutes(editBreak),
                          })
                          if (outcome.ok) setEditingScheduleId(null)
                        }}
                      >
                        Save
                      </GuardedButton>
                      <button className="secondary-button compact-action" type="button" onClick={() => setEditingScheduleId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <GuardedButton
                      className="secondary-button compact-action"
                      readOnly={isReadOnly}
                      onClick={() => startScheduleEdit(schedule)}
                    >
                      Edit
                    </GuardedButton>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <TableStatus loading={loading} empty={visibleSchedules.length === 0} emptyText="No schedules found." />

      <TimeOff
        schedules={visibleSchedules}
        doctorName={doctorNameFor}
        loading={loading}
        readOnly={isReadOnly}
        onAdd={onAddTimeOff}
        onRemove={onRemoveTimeOff}
      />
    </>
  )
}

// A daily break as two time inputs' values, "12:00" and "13:00"; both empty
// for none.
type BreakInput = { start: string; end: string }
const noBreak: BreakInput = { start: '', end: '' }

// Both times or neither; the API checks that the break fits the hours.
function isBreakComplete({ start, end }: BreakInput) {
  return start === '' ? end === '' : end !== '' && start < end
}

// "12:30" is 750 minutes after midnight; no break is null for both.
function breakMinutes({ start, end }: BreakInput) {
  const minutes = (value: string) => {
    if (!value) return null
    const [hour = 0, minute = 0] = value.split(':').map(Number)
    return hour * 60 + minute
  }
  return { breakStartMinute: minutes(start), breakEndMinute: minutes(end) }
}

function BreakPicker({
  label,
  hideLabel = false,
  value,
  onChange,
}: {
  label: string
  hideLabel?: boolean
  value: BreakInput
  onChange: (value: BreakInput) => void
}) {
  return (
    <fieldset className="break-picker">
      <legend className={hideLabel ? 'visually-hidden' : undefined}>{label}</legend>
      <input
        aria-label={`${label} starts`}
        className="table-input"
        step="300"
        type="time"
        value={value.start}
        onChange={(event) => onChange({ ...value, start: event.target.value })}
      />
      <span aria-hidden="true">-</span>
      <input
        aria-label={`${label} ends`}
        className="table-input"
        step="300"
        type="time"
        value={value.end}
        onChange={(event) => onChange({ ...value, end: event.target.value })}
      />
    </fieldset>
  )
}

// Days doctors are away, clinic dates with both ends included: a form to add
// some, and the time off that has not ended yet, soonest first.
function TimeOff({
  schedules,
  doctorName,
  loading,
  readOnly,
  onAdd,
  onRemove,
}: {
  schedules: ScheduleDto[]
  doctorName: (schedule: ScheduleDto) => string
  loading: boolean
  readOnly: boolean
  onAdd: (scheduleId: number, input: AddTimeOffInput) => Promise<ActionOutcome>
  onRemove: (scheduleId: number, timeOff: TimeOffDto, doctorName: string) => Promise<ActionOutcome>
}) {
  const today = todayInputValue()
  const [scheduleId, setScheduleId] = useState<number | ''>('')
  const [firstDay, setFirstDay] = useState(today)
  const [lastDay, setLastDay] = useState(today)
  const [reason, setReason] = useState('')
  // An API older than this build sends no time off. Dates sort as text.
  const upcoming = schedules
    .flatMap((schedule) => (schedule.timeOff ?? []).map((timeOff) => ({ schedule, timeOff })))
    .sort((left, right) => (left.timeOff.firstDay < right.timeOff.firstDay ? -1 : 1))

  return (
    <section className="time-off" aria-labelledby="time-off-heading">
      <h3 className="section-label" id="time-off-heading">
        Time off
      </h3>
      <div className="inline-form time-off-form">
        <label>
          Doctor
          <select value={scheduleId} onChange={(event) => setScheduleId(event.target.value === '' ? '' : Number(event.target.value))}>
            <option value="">Select doctor</option>
            {schedules.map((schedule) => (
              <option key={schedule.scheduleId} value={schedule.scheduleId}>{doctorName(schedule)}</option>
            ))}
          </select>
        </label>
        <label>
          First day
          <input
            min={today}
            type="date"
            value={firstDay}
            onChange={(event) => {
              setFirstDay(event.target.value)
              if (event.target.value > lastDay) setLastDay(event.target.value)
            }}
          />
        </label>
        <label>
          Last day
          <input min={firstDay || today} type="date" value={lastDay} onChange={(event) => setLastDay(event.target.value)} />
        </label>
        <label>
          Reason
          <input maxLength={200} placeholder="Optional" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <GuardedButton
          className="secondary-button"
          readOnly={readOnly}
          disabled={scheduleId === '' || !firstDay || !lastDay || lastDay < firstDay || loading}
          onClick={async () => {
            if (scheduleId === '') return
            const outcome = await onAdd(scheduleId, { firstDay, lastDay, reason: reason.trim() || null })
            if (outcome.ok) {
              setScheduleId('')
              setReason('')
            }
          }}
        >
          Add Time Off
        </GuardedButton>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {upcoming.map(({ schedule, timeOff }) => (
            <tr key={timeOff.timeOffId}>
              <td><strong>{doctorName(schedule)}</strong></td>
              <td>{formatTimeOff(timeOff)}</td>
              <td>{timeOff.reason}</td>
              <td>
                <GuardedButton
                  aria-label={`Remove time off on ${formatTimeOff(timeOff)} for ${doctorName(schedule)}`}
                  className="secondary-button compact-action"
                  readOnly={readOnly}
                  disabled={loading}
                  onClick={() => void onRemove(schedule.scheduleId, timeOff, doctorName(schedule))}
                >
                  Remove
                </GuardedButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableStatus loading={loading} empty={upcoming.length === 0} emptyText="No time off ahead." />
    </section>
  )
}

// One checkbox per day, Monday first.
function DayPicker({ label, days, onChange }: { label: string; days: DayOfWeek[]; onChange: (days: DayOfWeek[]) => void }) {
  return (
    <fieldset className="day-picker">
      <legend className="visually-hidden">{label}</legend>
      {weekOrder.map((day) => (
        <label key={day} title={day}>
          <input
            checked={days.includes(day)}
            type="checkbox"
            onChange={(event) =>
              onChange(weekOrder.filter((item) => (item === day ? event.target.checked : days.includes(item))))
            }
          />
          {day.slice(0, 3)}
        </label>
      ))}
    </fieldset>
  )
}
