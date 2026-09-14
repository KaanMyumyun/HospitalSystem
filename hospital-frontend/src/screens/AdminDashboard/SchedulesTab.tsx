import { useState } from 'react'
import type { ChangeScheduleInput, CreateScheduleInput, DoctorDto, ScheduleDto } from '../../api'
import { EmptyState, SkeletonRows } from '../../components/ui'
import { formatTime } from '../../lib/format'

export function SchedulesTab({
  schedules,
  doctors,
  loading,
  searchQuery,
  isReadOnly,
  onChangeSchedule,
  onCreateSchedule,
}: {
  schedules: ScheduleDto[]
  doctors: DoctorDto[]
  loading: boolean
  searchQuery: string
  isReadOnly: boolean
  onChangeSchedule: (input: ChangeScheduleInput) => Promise<void>
  onCreateSchedule: (input: CreateScheduleInput) => Promise<void>
}) {
  const [scheduleDoctorId, setScheduleDoctorId] = useState<number | ''>('')
  const [scheduleStartHour, setScheduleStartHour] = useState('8')
  const [scheduleEndHour, setScheduleEndHour] = useState('16')
  const [scheduleSlotDuration, setScheduleSlotDuration] = useState('15')
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editStartHour, setEditStartHour] = useState('')
  const [editEndHour, setEditEndHour] = useState('')
  const [editSlotDuration, setEditSlotDuration] = useState('')

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleSchedules = schedules.filter((schedule) => {
    const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
    return !normalizedSearch || (doctor?.name ?? '').toLowerCase().includes(normalizedSearch)
  })

  const scheduleInput = (): CreateScheduleInput => ({
    DoctorId: Number(scheduleDoctorId),
    StartHour: Number(scheduleStartHour),
    EndHour: Number(scheduleEndHour),
    SlotDurationMin: Number(scheduleSlotDuration),
  })
  const startScheduleEdit = (schedule: ScheduleDto) => {
    setEditingScheduleId(schedule.scheduleId)
    setEditStartHour(String(new Date(schedule.startTime).getUTCHours()))
    setEditEndHour(String(new Date(schedule.endTime).getUTCHours()))
    setEditSlotDuration(String(schedule.slotDurationMin))
  }

  return (
    <>
      <div className="inline-form schedule-form">
        <label>
          Doctor
          <select value={scheduleDoctorId} onChange={(event) => setScheduleDoctorId(Number(event.target.value))}>
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
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
        <button
          className="secondary-button"
          disabled={!scheduleDoctorId || Number(scheduleStartHour) >= Number(scheduleEndHour) || isReadOnly}
          title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
          type="button"
          onClick={() => void onCreateSchedule(scheduleInput())}
        >
          Create Schedule
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Start</th>
            <th>End</th>
            <th>Slot</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleSchedules.map((schedule) => {
            const doctor = doctors.find((item) => item.doctorId === schedule.doctorId)
            return (
              <tr key={schedule.scheduleId}>
                <td><strong>{doctor?.name ?? `Doctor ${schedule.doctorId}`}</strong></td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input className="table-input" type="number" min="0" max="23" value={editStartHour} onChange={(event) => setEditStartHour(event.target.value)} />
                  ) : (
                    formatTime(new Date(schedule.startTime))
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input className="table-input" type="number" min="1" max="24" value={editEndHour} onChange={(event) => setEditEndHour(event.target.value)} />
                  ) : (
                    formatTime(new Date(schedule.endTime))
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <input className="table-input" type="number" min="5" step="5" value={editSlotDuration} onChange={(event) => setEditSlotDuration(event.target.value)} />
                  ) : (
                    `${schedule.slotDurationMin} min`
                  )}
                </td>
                <td>
                  {editingScheduleId === schedule.scheduleId ? (
                    <div className="table-actions">
                      <button
                        className="secondary-button compact-action"
                        disabled={Number(editStartHour) >= Number(editEndHour) || isReadOnly}
                        title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                        type="button"
                        onClick={() => {
                          void onChangeSchedule({
                            ScheduleId: schedule.scheduleId,
                            DoctorId: schedule.doctorId,
                            StartHour: Number(editStartHour),
                            EndHour: Number(editEndHour),
                            SlotDurationMin: Number(editSlotDuration),
                          })
                          setEditingScheduleId(null)
                        }}
                      >
                        Save
                      </button>
                      <button className="secondary-button compact-action" type="button" onClick={() => setEditingScheduleId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="secondary-button compact-action"
                      disabled={isReadOnly}
                      title={isReadOnly ? 'Demo accounts are read-only.' : undefined}
                      type="button"
                      onClick={() => startScheduleEdit(schedule)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {loading && <SkeletonRows count={5} />}
      {!loading && visibleSchedules.length === 0 && <EmptyState text="No schedules found." />}
    </>
  )
}
