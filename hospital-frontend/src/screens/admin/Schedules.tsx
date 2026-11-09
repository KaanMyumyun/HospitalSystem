import { useEffect, useMemo, useState } from 'react'
import { addTimeOff, changeSchedule, createSchedule, removeTimeOff } from '../../api/client'
import type { DayOfWeek, ScheduleDto, TimeOffDto } from '../../api/client'
import { useNow } from '../../app/hooks'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate } from '../../lib/clinicTime'
import { dateOnlyShort } from '../../lib/dates'
import { formatBreak, formatHourRange } from '../../lib/format'
import { departmentHue, personName } from '../../lib/names'
import { clockLabel, scheduleWindow } from '../../lib/time'
import type { ScreenProps } from '../../shell/Shell'
import { Button, IconButton } from '../../ui/Button'
import { DeptDot, Empty, LoadError, Segmented, Skeleton, Switch } from '../../ui/bits'
import { Dialog } from '../../ui/Dialog'
import { Field, FormError, Select } from '../../ui/Field'
import { PageHead, SearchField } from '../../ui/Page'
import { slotsPerDay, weekOrder } from '../../lib/scheduleMath'
import { DayDots, HoursRuler, ScheduleRuler } from './adminShared'
import './admin.css'

type Editing = { mode: 'create'; doctorId: number | null } | { mode: 'edit'; schedule: ScheduleDto }

export function Schedules({ params }: ScreenProps) {
  const { data, dataReady, dataError, readOnly, refresh, run, confirm, departmentOf, doctorOf, scheduleOf } = useWorkspace()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [timeOffFor, setTimeOffFor] = useState<ScheduleDto | null>(null)
  const focus = Number(params.get('doctor')) || null

  const cards = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.schedules
      .map((schedule) => ({ schedule, doctor: doctorOf(schedule.doctorId) }))
      .filter(({ doctor }) => {
        if (!needle) return true
        const haystack = `${personName(doctor?.name ?? '')} ${doctor?.name ?? ''} ${departmentOf(doctor?.departmentId)?.name ?? ''}`
        return haystack.toLowerCase().includes(needle)
      })
      .sort((left, right) => personName(left.doctor?.name ?? '').localeCompare(personName(right.doctor?.name ?? '')))
  }, [data.schedules, query, doctorOf, departmentOf])

  const unscheduled = data.doctors
    .filter((doctor) => doctor.isActive && departmentOf(doctor.departmentId)?.isActive && !scheduleOf(doctor.doctorId))
    .sort((left, right) => personName(left.name).localeCompare(personName(right.name)))

  useEffect(() => {
    if (!focus || !dataReady) return
    document.getElementById(`schedule-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focus, dataReady])

  const remove = async (schedule: ScheduleDto, timeOff: TimeOffDto) => {
    const name = personName(doctorOf(schedule.doctorId)?.name ?? 'this doctor')
    const range = timeOff.firstDay === timeOff.lastDay ? dateOnlyShort(timeOff.firstDay) : `${dateOnlyShort(timeOff.firstDay)} – ${dateOnlyShort(timeOff.lastDay)}`
    const ok = await confirm({
      eyebrow: name,
      title: 'Take this time off back?',
      message: `${range} can be booked again as soon as you confirm.`,
      confirmLabel: 'Remove time off',
    })
    if (!ok) return
    await run(() => removeTimeOff(schedule.scheduleId, timeOff.timeOffId), `Time off removed for ${name}`)
  }

  return (
    <div className="page">
      <PageHead
        actions={
          <Button
            disabled={unscheduled.length === 0}
            icon="plus"
            locked={readOnly}
            title={unscheduled.length === 0 ? 'Every active doctor already has a schedule' : undefined}
            variant="primary"
            onClick={() => setEditing({ mode: 'create', doctorId: null })}
          >
            New schedule
          </Button>
        }
        lede="Working hours, slot length, a daily break and time off. Reception books only inside these."
        title="Schedules"
      />
      <div className="page-toolbar">
        <SearchField className="toolbar-search" label="Find a doctor" placeholder="Find a doctor" value={query} onChange={setQuery} />
        <span className="toolbar-count num">{data.schedules.length} schedules</span>
      </div>
      <div className="page-body">
        {dataError && !dataReady ? (
          <LoadError message={dataError} onRetry={() => void refresh()} />
        ) : !dataReady ? (
          <Skeleton lines={8} />
        ) : (
          <>
            {unscheduled.length > 0 && (
              <section aria-label="Doctors without a schedule" className="unscheduled">
                <p className="unscheduled-title">
                  <strong>
                    {unscheduled.length} {unscheduled.length === 1 ? 'doctor' : 'doctors'}
                  </strong>{' '}
                  can't be booked until they have working hours.
                </p>
                <ul>
                  {unscheduled.map((doctor) => (
                    <li key={doctor.doctorId}>
                      <span>{personName(doctor.name)}</span>
                      <Button
                        locked={readOnly}
                        size="sm"
                        variant="quiet"
                        onClick={() => setEditing({ mode: 'create', doctorId: doctor.doctorId })}
                      >
                        Set hours
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {cards.length === 0 ? (
              <Empty title={query ? 'No schedule matches' : 'No schedules yet'}>
                {query ? 'Try another name.' : 'Give a doctor working hours to open them for bookings.'}
              </Empty>
            ) : (
              <div className="schedule-grid">
                {cards.map(({ schedule, doctor }) => {
                  const { startMinutes, endMinutes } = scheduleWindow(schedule)
                  const perDay = slotsPerDay(startMinutes, endMinutes, schedule.slotDurationMin, schedule.breakStartMinute, schedule.breakEndMinute)
                  const department = departmentOf(doctor?.departmentId)
                  return (
                    <article
                      className={`schedule-card${focus === schedule.doctorId ? ' is-focus' : ''}${doctor?.isActive === false ? ' is-muted' : ''}`}
                      id={`schedule-${schedule.doctorId}`}
                      key={schedule.scheduleId}
                    >
                      <header className="schedule-card-head">
                        <div>
                          <p className="schedule-dept">
                            <DeptDot hue={departmentHue(department?.id)} />
                            {department?.name ?? 'No department'}
                            {doctor?.isActive === false && <span className="tag">Inactive</span>}
                          </p>
                          <h2 className="schedule-name">{personName(doctor?.name ?? `Doctor ${schedule.doctorId}`)}</h2>
                        </div>
                        <Button icon="edit" locked={readOnly} size="sm" onClick={() => setEditing({ mode: 'edit', schedule })}>
                          Edit
                        </Button>
                      </header>
                      <ScheduleRuler schedule={schedule} />
                      <dl className="schedule-facts">
                        <div>
                          <dt>Hours</dt>
                          <dd className="mono">{formatHourRange(schedule).replace('-', '–')}</dd>
                        </div>
                        <div>
                          <dt>Slots</dt>
                          <dd>
                            {schedule.slotDurationMin} min <span className="muted">· {perDay} a day</span>
                          </dd>
                        </div>
                        <div>
                          <dt>Break</dt>
                          <dd className={formatBreak(schedule) ? 'mono' : 'muted'}>{formatBreak(schedule)?.replace('-', '–') ?? 'None'}</dd>
                        </div>
                        <div>
                          <dt>Days</dt>
                          <dd>
                            <DayDots days={schedule.workingDays} />
                          </dd>
                        </div>
                      </dl>
                      <div className="schedule-off">
                        <div className="schedule-off-head">
                          <p>Time off</p>
                          <Button icon="plus" locked={readOnly} size="sm" variant="ghost" onClick={() => setTimeOffFor(schedule)}>
                            Add
                          </Button>
                        </div>
                        {schedule.timeOff.length === 0 ? (
                          <p className="muted schedule-off-none">Nothing planned.</p>
                        ) : (
                          <ul>
                            {[...schedule.timeOff]
                              .sort((left, right) => left.firstDay.localeCompare(right.firstDay))
                              .map((timeOff) => (
                                <li key={timeOff.timeOffId}>
                                  <span className="off-dates">
                                    {timeOff.firstDay === timeOff.lastDay
                                      ? dateOnlyShort(timeOff.firstDay)
                                      : `${dateOnlyShort(timeOff.firstDay)} – ${dateOnlyShort(timeOff.lastDay)}`}
                                  </span>
                                  {timeOff.reason && <span className="off-reason">{timeOff.reason}</span>}
                                  <IconButton
                                    icon="close"
                                    label={`Remove time off from ${timeOff.firstDay}`}
                                    locked={readOnly}
                                    size="sm"
                                    onClick={() => void remove(schedule, timeOff)}
                                  />
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      {editing && <ScheduleEditor editing={editing} onClose={() => setEditing(null)} />}
      {timeOffFor && <TimeOffDialog schedule={timeOffFor} onClose={() => setTimeOffFor(null)} />}
    </div>
  )
}

const slotChoices = [10, 15, 20, 30, 45, 60]
const toMinutes = (value: string) => {
  const [hour = 0, minute = 0] = value.split(':').map(Number)
  return hour * 60 + minute
}

function ScheduleEditor({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { data, busy, readOnly, run, runBookingChange, departmentOf, doctorOf, scheduleOf } = useWorkspace()
  const existing = editing.mode === 'edit' ? editing.schedule : null
  const initial = existing ? scheduleWindow(existing) : { startMinutes: 8 * 60, endMinutes: 16 * 60 }
  const [doctorId, setDoctorId] = useState<number | null>(editing.mode === 'create' ? editing.doctorId : (existing?.doctorId ?? null))
  const [start, setStart] = useState(Math.floor(initial.startMinutes / 60))
  const [end, setEnd] = useState(Math.ceil(initial.endMinutes / 60))
  const [slot, setSlot] = useState(existing?.slotDurationMin || 30)
  const [custom, setCustom] = useState(existing ? !slotChoices.includes(existing.slotDurationMin) : false)
  const [days, setDays] = useState<DayOfWeek[]>(existing?.workingDays ?? weekOrder.slice(0, 5))
  const [hasBreak, setHasBreak] = useState(existing ? existing.breakStartMinute !== null : false)
  const [breakStart, setBreakStart] = useState(existing?.breakStartMinute != null ? clockLabel(existing.breakStartMinute) : '12:00')
  const [breakEnd, setBreakEnd] = useState(existing?.breakEndMinute != null ? clockLabel(existing.breakEndMinute) : '13:00')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choices = data.doctors
    .filter((doctor) => doctor.isActive && departmentOf(doctor.departmentId)?.isActive && !scheduleOf(doctor.doctorId))
    .sort((left, right) => personName(left.name).localeCompare(personName(right.name)))
  const windowMinutes = (end - start) * 60
  const breakFrom = hasBreak ? toMinutes(breakStart) : null
  const breakTo = hasBreak ? toMinutes(breakEnd) : null

  const problems = {
    doctor: doctorId === null ? 'Choose a doctor' : null,
    hours: start >= end ? 'The day has to end after it starts' : null,
    slot:
      slot < 5 || slot > 120
        ? 'Use 5 to 120 minutes'
        : windowMinutes > 0 && windowMinutes % slot !== 0
          ? `${slot} minutes doesn't divide ${end - start} hours evenly`
          : null,
    days: days.length === 0 ? 'Pick at least one day' : null,
    break:
      !hasBreak || breakFrom === null || breakTo === null
        ? null
        : breakFrom >= breakTo
          ? 'The break has to end after it starts'
          : breakFrom < start * 60 || breakTo > end * 60
            ? 'Keep the break inside the working hours'
            : breakFrom === start * 60 && breakTo === end * 60
              ? 'The break can’t take the whole day'
              : null,
  }
  const perDay = problems.hours || problems.slot ? 0 : slotsPerDay(start * 60, end * 60, slot, breakFrom, breakTo)
  const doctorName = personName(doctorOf(doctorId ?? undefined)?.name ?? '')

  const submit = async () => {
    setTried(true)
    if (Object.values(problems).some(Boolean) || doctorId === null) return
    const input = {
      startHour: start,
      endHour: end,
      slotDurationMin: slot,
      workingDays: weekOrder.filter((day) => days.includes(day)),
      breakStartMinute: breakFrom,
      breakEndMinute: breakTo,
    }
    const outcome = existing
      ? await runBookingChange((cancel) => changeSchedule(existing.scheduleId, input, cancel), `${doctorName}'s schedule saved`)
      : await run(() => createSchedule({ doctorId, ...input }), `${doctorName} can now be booked`, { quiet: true })
    if (outcome.ok) onClose()
    else if (outcome.error && !existing) setError(outcome.error)
  }

  const hourOptions = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index).map((hour) => (
      <option key={hour} value={hour}>
        {clockLabel(hour * 60)}
      </option>
    ))

  return (
    <Dialog
      description={existing ? 'Bookings that no longer fit are listed before anything is saved.' : 'Reception can book this doctor as soon as you save.'}
      dismissOnBackdrop={false}
      eyebrow={existing ? 'Edit schedule' : 'New schedule'}
      footer={
        <>
          <span className="foot-note">{perDay > 0 ? `${perDay} slots a day · ${perDay * days.length} a week` : ' '}</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} locked={readOnly} type="submit" variant="primary">
            {existing ? 'Save schedule' : 'Create schedule'}
          </Button>
        </>
      }
      title={existing ? doctorName : 'Working hours'}
      variant="sheet"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {!existing && (
        <Field error={tried ? problems.doctor : null} label="Doctor">
          {(control) => (
            <Select
              {...control}
              value={doctorId ?? ''}
              onChange={(event) => setDoctorId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Choose a doctor</option>
              {choices.map((doctor) => (
                <option key={doctor.doctorId} value={doctor.doctorId}>
                  {personName(doctor.name)} · {departmentOf(doctor.departmentId)?.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="editor-preview">
        <HoursRuler breakEnd={breakTo} breakStart={breakFrom} endMinutes={end * 60} startMinutes={start * 60} />
      </div>

      <div className="form-grid-2">
        <Field error={tried ? problems.hours : null} label="Starts at">
          {(control) => (
            <Select {...control} value={start} onChange={(event) => setStart(Number(event.target.value))}>
              {hourOptions(0, 23)}
            </Select>
          )}
        </Field>
        <Field label="Ends at">
          {(control) => (
            <Select {...control} value={end} onChange={(event) => setEnd(Number(event.target.value))}>
              {hourOptions(1, 24)}
            </Select>
          )}
        </Field>
      </div>

      <fieldset className="field fieldset">
        <legend className="field-label">Slot length, in minutes</legend>
        <div className="slot-picker">
          <Segmented
            label="Slot length in minutes"
            options={[
              ...slotChoices.map((minutes) => ({
                value: String(minutes),
                label: String(minutes),
                disabled: windowMinutes > 0 && windowMinutes % minutes !== 0,
                title:
                  windowMinutes > 0 && windowMinutes % minutes !== 0
                    ? `Doesn't divide ${end - start} hours evenly`
                    : `${minutes} minutes`,
              })),
              { value: 'other', label: 'Other' },
            ]}
            value={custom ? 'other' : String(slot)}
            onChange={(value) => {
              if (value === 'other') setCustom(true)
              else {
                setCustom(false)
                setSlot(Number(value))
              }
            }}
          />
          {custom && (
            <span className="slot-custom">
              <input
                aria-label="Minutes per slot"
                className="input input-sm"
                max={120}
                min={5}
                step={5}
                type="number"
                value={slot}
                onChange={(event) => setSlot(Number(event.target.value))}
              />
              <span className="muted">minutes</span>
            </span>
          )}
        </div>
        {(tried || custom) && problems.slot && <p className="field-error">{problems.slot}</p>}
      </fieldset>

      <fieldset className="field fieldset">
        <legend className="field-label">Working days</legend>
        <div className="day-toggles">
          {weekOrder.map((day) => (
            <button
              aria-label={day}
              aria-pressed={days.includes(day)}
              className="day-toggle"
              key={day}
              type="button"
              onClick={() =>
                setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]))
              }
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        {tried && problems.days && <p className="field-error">{problems.days}</p>}
      </fieldset>

      <div className="break-block">
        <div className="break-head">
          <div>
            <p className="field-label">Daily break</p>
            <p className="field-hint">Nothing can be booked during it.</p>
          </div>
          <Switch checked={hasBreak} label="Daily break" onChange={setHasBreak} />
        </div>
        {hasBreak && (
          <div className="form-grid-2">
            <Field error={tried ? problems.break : null} label="From">
              {(control) => (
                <input
                  {...control}
                  className="input"
                  step={300}
                  type="time"
                  value={breakStart}
                  onChange={(event) => setBreakStart(event.target.value)}
                />
              )}
            </Field>
            <Field label="Until">
              {(control) => (
                <input {...control} className="input" step={300} type="time" value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} />
              )}
            </Field>
          </div>
        )}
      </div>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}

function TimeOffDialog({ schedule, onClose }: { schedule: ScheduleDto; onClose: () => void }) {
  const { busy, readOnly, runBookingChange, doctorOf } = useWorkspace()
  const now = useNow(60_000)
  const today = clinicDate(now)
  const [first, setFirst] = useState(today)
  const [last, setLast] = useState(today)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const name = personName(doctorOf(schedule.doctorId)?.name ?? 'This doctor')
  const span = first && last ? (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000 + 1 : 0

  const problem = !first || !last ? 'Choose both days' : last < first ? 'The last day comes before the first' : last < today ? 'That time off is already over' : span > 366 ? 'Keep it to a year at most' : null

  const submit = async () => {
    setTried(true)
    if (problem) return
    const outcome = await runBookingChange(
      (cancel) => addTimeOff(schedule.scheduleId, { firstDay: first, lastDay: last, reason: reason.trim() || null }, cancel),
      `Time off added for ${name}`,
    )
    if (outcome.ok) onClose()
  }

  return (
    <Dialog
      description="Those days show as away in reception. If anyone is already booked, you'll see who first."
      dismissOnBackdrop={false}
      eyebrow={name}
      footer={
        <>
          <span className="foot-note">{span > 0 && !problem ? `${span} ${span === 1 ? 'day' : 'days'}` : ' '}</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} locked={readOnly} type="submit" variant="primary">
            Add time off
          </Button>
        </>
      }
      size="sm"
      title="Time off"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="form-grid-2">
        <Field error={tried ? problem : null} label="First day">
          {(control) => (
            <input
              {...control}
              className="input"
              min={today}
              type="date"
              value={first}
              onChange={(event) => {
                setFirst(event.target.value)
                if (event.target.value > last) setLast(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Last day">
          {(control) => (
            <input {...control} className="input" min={first || today} type="date" value={last} onChange={(event) => setLast(event.target.value)} />
          )}
        </Field>
      </div>
      <Field hint="Optional. Reception sees it on the away days." label="Reason">
        {(control) => (
          <input
            {...control}
            className="input"
            maxLength={200}
            placeholder="Conference, leave, training…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </Field>
    </Dialog>
  )
}
