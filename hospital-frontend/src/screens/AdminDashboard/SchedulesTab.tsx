import { useState } from 'react'
import type {
  ChangeScheduleInput,
  CreateScheduleInput,
  DayOfWeek,
  DepartmentDto,
  DoctorDto,
  ScheduleDto,
} from '../../api'
import { GuardedButton, TableStatus } from '../../components/ui'
import { formatWorkingDays } from '../../lib/format'
import { clockLabel, scheduleWindow } from '../../lib/time'
import type { ActionOutcome } from '../../types'

const weekOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const mondayToFriday = weekOrder.slice(0, 5)

export function SchedulesTab({
  schedules,
  departments,
  doctors,
  loading,
  searchQuery,
  isReadOnly,
  onChangeSchedule,
  onCreateSchedule,
}: {
  schedules: ScheduleDto[]
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  loading: boolean
  searchQuery: string
  isReadOnly: boolean
  onChangeSchedule: (scheduleId: number, input: ChangeScheduleInput) => Promise<ActionOutcome>
  onCreateSchedule: (input: CreateScheduleInput) => Promise<ActionOutcome>
}) {
  const [scheduleDoctorId, setScheduleDoctorId] = useState<number | ''>('')
  const [scheduleStartHour, setScheduleStartHour] = useState('8')
  const [scheduleEndHour, setScheduleEndHour] = useState('16')
  const [scheduleSlotDuration, setScheduleSlotDuration] = useState('15')
  const [scheduleDays, setScheduleDays] = useState<DayOfWeek[]>(mondayToFriday)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editStartHour, setEditStartHour] = useState('')
  const [editEndHour, setEditEndHour] = useState('')
  const [editSlotDuration, setEditSlotDuration] = useState('')
  const [editDays, setEditDays] = useState<DayOfWeek[]>([])

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleSchedules = schedules.filter((schedule) => {
    const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
    return !normalizedSearch || (doctor?.name ?? '').toLowerCase().includes(normalizedSearch)
  })

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
  })
  const startScheduleEdit = (schedule: ScheduleDto) => {
    setEditingScheduleId(schedule.scheduleId)
    const { startMinutes, endMinutes } = scheduleWindow(schedule)
    setEditStartHour(String(startMinutes / 60))
    setEditEndHour(String(endMinutes / 60))
    setEditSlotDuration(String(schedule.slotDurationMin))
    setEditDays(schedule.workingDays)
  }

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
        <DayPicker label="Working days" days={scheduleDays} onChange={setScheduleDays} />
        <GuardedButton
          className="secondary-button"
          readOnly={isReadOnly}
          disabled={
            !scheduleDoctorId || Number(scheduleStartHour) >= Number(scheduleEndHour) || scheduleDays.length === 0 || loading
          }
          onClick={async () => {
            if ((await onCreateSchedule(scheduleInput())).ok) setScheduleDoctorId('')
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
            <th>Days</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleSchedules.map((schedule) => {
            const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
            const doctorName = doctor?.name ?? `Doctor ${schedule.doctorId}`
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
                        disabled={Number(editStartHour) >= Number(editEndHour) || editDays.length === 0 || loading}
                        onClick={async () => {
                          const outcome = await onChangeSchedule(schedule.scheduleId, {
                            startHour: Number(editStartHour),
                            endHour: Number(editEndHour),
                            slotDurationMin: Number(editSlotDuration),
                            workingDays: editDays,
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
    </>
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
