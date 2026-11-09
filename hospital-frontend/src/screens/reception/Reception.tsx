import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { changeAppointmentStatus, loadAppointments, moveAppointment } from '../../api/client'
import type { AppointmentDto } from '../../api/client'
import { useMediaQuery, useNow } from '../../app/hooks'
import { useResource } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate } from '../../lib/clinicTime'
import { dayOfMonth, mediumDate, timeOf, weekdayShort, weekRangeLabel } from '../../lib/dates'
import { formatBreak, formatHourRange, formatWorkingDays, statusLabel } from '../../lib/format'
import { departmentHue, personName } from '../../lib/names'
import {
  buildWeekSlots,
  dateAtTime,
  defaultDoctor,
  getNextAvailableSlot,
  isInWeek,
  shownDays,
  weekDays,
  weekRange,
} from '../../lib/schedule'
import type { ScreenProps } from '../../shell/Shell'
import type { Slot } from '../../types'
import { Button, IconButton } from '../../ui/Button'
import { DeptDot, Empty, LoadError, Segmented, Skeleton } from '../../ui/bits'
import { Dialog } from '../../ui/Dialog'
import { Icon } from '../../ui/Icon'
import { AppointmentDetails, WeekSummary } from './AppointmentPane'
import { BookingDialog } from './BookingDialog'
import { CancelDialog } from './CancelDialog'
import { DoctorList } from './DoctorList'
import { Timetable } from './Timetable'
import './reception.css'

import type { DeskMemory } from './deskParams'

export function Reception({
  memory,
  onMemory,
}: ScreenProps & { memory: DeskMemory; onMemory: Dispatch<SetStateAction<DeskMemory>> }) {
  const { data, dataReady, dataError, readOnly, run, confirm, departmentOf, scheduleOf, refresh } = useWorkspace()
  const now = useNow(30_000)
  const withPane = useMediaQuery('(min-width: 1360px)')
  const withDoctors = useMediaQuery('(min-width: 1180px)')
  const dayMode = useMediaQuery('(max-width: 759px)')
  const [booking, setBooking] = useState<Slot | null>(null)
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null)
  const [moving, setMoving] = useState<AppointmentDto | null>(null)
  const [picking, setPicking] = useState(false)
  const [dayChoice, setDayChoice] = useState<{ week: string; index: number } | null>(null)
  const [madeAt, setMadeAt] = useState<number | null>(null)

  const bookable = useMemo(
    () => data.doctors.filter((doctor) => doctor.isActive && departmentOf(doctor.departmentId)?.isActive),
    [data.doctors, departmentOf],
  )
  const doctor =
    bookable.find((candidate) => candidate.doctorId === memory.doctorId) ?? defaultDoctor(bookable, data.schedules) ?? null
  const doctorId = doctor?.doctorId ?? null
  const schedule = scheduleOf(doctorId ?? undefined)
  const weekOffset = memory.weekOffset
  const { from, to } = weekRange(weekOffset)
  const fromMs = from.getTime()
  const toMs = to.getTime()

  const { data: appointments, error: weekError, reload } = useResource(
    doctorId === null ? null : `week:${doctorId}:${fromMs}`,
    (signal) => loadAppointments(doctorId ?? 0, new Date(fromMs), new Date(toMs), signal),
  )

  const days = weekDays(weekOffset, shownDays(schedule, appointments, weekOffset))
  const slots = buildWeekSlots(schedule, doctorId ?? undefined, appointments, weekOffset)
  const nextOpen = getNextAvailableSlot(slots)
  const flat = slots.flat()
  const counts = {
    booked: flat.filter((slot) => slot.status === 'booked').length,
    available: flat.filter((slot) => slot.status === 'available').length,
    capacity: flat.filter((slot) => ['booked', 'available', 'past', 'cancelled'].includes(slot.status)).length,
    cancelled: (appointments ?? []).filter(
      (item) => item.status === 'Cancelled' && isInWeek(new Date(item.appointmentTime), weekOffset),
    ).length,
  }

  const atMadeTime = (item: AppointmentDto) => new Date(item.appointmentTime).getTime() === madeAt
  const made =
    madeAt === null
      ? undefined
      : (appointments?.find((item) => item.status === 'Scheduled' && atMadeTime(item)) ?? appointments?.find(atMadeTime))
  const selectedId = made?.appointmentId ?? memory.selectedId
  const selected = appointments?.find((item) => item.appointmentId === selectedId) ?? null
  const weekKey = `${doctorId}:${fromMs}`
  const todayIndex = days.findIndex((day) => clinicDate(day) === clinicDate(now))
  const selectedIndex = selected ? days.findIndex((day) => clinicDate(day) === clinicDate(new Date(selected.appointmentTime))) : -1
  const defaultDay = selectedIndex >= 0 ? selectedIndex : Math.max(todayIndex, 0)
  const shownDay = Math.min(dayChoice?.week === weekKey ? dayChoice.index : defaultDay, Math.max(days.length - 1, 0))
  const visibleDays = dayMode ? days.slice(shownDay, shownDay + 1) : days
  const visibleSlots = dayMode ? slots.map((row) => row.slice(shownDay, shownDay + 1)) : slots

  const select = useCallback(
    (appointmentId: number | null) => {
      setMadeAt(null)
      onMemory((current) => ({ ...current, selectedId: appointmentId }))
    },
    [onMemory],
  )

  const setWeek = useCallback(
    (update: (offset: number) => number) => {
      onMemory((current) => ({ ...current, weekOffset: update(current.weekOffset) }))
    },
    [onMemory],
  )

  const chooseDoctor = (id: number) => {
    setMadeAt(null)
    onMemory((current) => ({ ...current, doctorId: id, selectedId: moving ? current.selectedId : null }))
    setPicking(false)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (document.querySelector('dialog[open]')) return
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('input, textarea, select, [role="grid"], [role="radiogroup"]')) return
      if (event.key === 'ArrowLeft') setWeek((offset) => offset - 1)
      else if (event.key === 'ArrowRight') setWeek((offset) => offset + 1)
      else if (event.key === 't' || event.key === 'T') setWeek(() => 0)
      else if (event.key === 'Escape') {
        if (moving) setMoving(null)
        else select(null)
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moving, setWeek, select])

  const moveTo = async (slot: Slot) => {
    if (!moving || !doctor) return
    const target = dateAtTime(slot.day, slot.time)
    const otherDoctor = doctor.doctorId !== moving.doctorId
    const ok = await confirm({
      eyebrow: 'Move booking',
      title: `Move ${moving.patientName.split(' ')[0]}'s visit?`,
      message: (
        <>
          From <strong>{mediumDate(new Date(moving.appointmentTime))} at {timeOf(new Date(moving.appointmentTime))}</strong>{' '}
          to <strong>{mediumDate(target)} at {slot.time}</strong>
          {otherDoctor ? (
            <>
              {' '}
              with <strong>{personName(doctor.name)}</strong>
            </>
          ) : null}
          . The old slot opens up straight away.
        </>
      ),
      confirmLabel: 'Move booking',
    })
    if (!ok) return
    const outcome = await run(
      () => moveAppointment(moving.appointmentId, target, otherDoctor ? doctor.doctorId : undefined),
      `Moved ${moving.patientName} to ${mediumDate(target)} at ${slot.time}`,
    )
    if (outcome.ok) {
      select(moving.appointmentId)
      setMoving(null)
    }
  }

  const pick = (slot: Slot) => {
    if (slot.appointment) {
      select(slot.appointment.appointmentId === selectedId ? null : slot.appointment.appointmentId)
      return
    }
    if (slot.status !== 'available') return
    if (moving) void moveTo(slot)
    else setBooking(slot)
  }

  const mark = (appointment: AppointmentDto, status: 'Completed' | 'NoShow') => {
    select(appointment.appointmentId)
    void run(
      () => changeAppointmentStatus(appointment.appointmentId, status),
      `${appointment.patientName} marked ${statusLabel(status).toLowerCase()}`,
    )
  }

  const startMove = (appointment: AppointmentDto) => {
    select(appointment.appointmentId)
    setBooking(null)
    setMoving(appointment)
  }

  const startCancel = (appointment: AppointmentDto) => {
    select(appointment.appointmentId)
    setCancelling(appointment)
  }

  const department = departmentOf(doctor?.departmentId)
  const lastDay = days[days.length - 1] ?? new Date(toMs - 1)
  const weekLabel = weekRangeLabel(days[0] ?? from, lastDay)

  const details = (framed: boolean) =>
    selected && (
      <AppointmentDetails
        appointment={selected}
        framed={framed}
        moving={moving?.appointmentId === selected.appointmentId}
        now={now}
        schedule={scheduleOf(selected.doctorId)}
        onCancel={startCancel}
        onClose={() => select(null)}
        onStopMoving={() => setMoving(null)}
        onMark={mark}
        onMove={startMove}
      />
    )

  let body
  if (dataError && !dataReady) body = <LoadError message={dataError} onRetry={() => void refresh()} />
  else if (!dataReady) body = <Skeleton className="week-skeleton" lines={9} />
  else if (!doctor)
    body = (
      <Empty size="lg" title="No one to book yet">
        An administrator needs to add a doctor to an active department before bookings can start.
      </Empty>
    )
  else if (!schedule)
    body = (
      <Empty size="lg" title={`${personName(doctor.name)} has no working hours yet`}>
        Bookings open once an administrator sets their schedule.
      </Empty>
    )
  else if (weekError && !appointments) body = <LoadError message={weekError} onRetry={() => void reload()} />
  else
    body = (
      <Timetable
        days={visibleDays}
        moving={moving}
        now={now}
        schedule={schedule}
        selectedId={selectedId}
        slots={visibleSlots}
        onPick={pick}
      />
    )

  return (
    <div className={`reception${moving ? ' is-moving' : ''}${withPane ? ' has-pane' : ''}${withDoctors ? ' has-doctors' : ''}`}>
      {withDoctors && (
        <aside aria-label="Doctors" className="reception-doctors">
          {dataReady ? (
            <DoctorList doctors={bookable} now={now} selectedId={doctorId} onSelect={chooseDoctor} />
          ) : dataError ? null : (
            <Skeleton className="doctor-list" lines={8} />
          )}
        </aside>
      )}

      <section aria-label="Week" className="reception-week">
        <header className="week-head">
          <p className="page-kicker week-kicker">
            {department && <DeptDot hue={departmentHue(department.id)} size={10} />}
            {department?.name ?? 'Reception'}
          </p>
          {withDoctors ? (
            <h1 className="page-title week-title">{doctor ? personName(doctor.name) : 'Reception'}</h1>
          ) : (
            <h1 className="page-title week-title">
              <button className="doctor-switch" type="button" onClick={() => setPicking(true)}>
                <span>{doctor ? personName(doctor.name) : 'Choose a doctor'}</span>
                <Icon name="chevron-down" size={22} />
              </button>
            </h1>
          )}
          <div className="week-nav-buttons">
            <IconButton icon="chevron-left" label="Previous week" variant="quiet" onClick={() => setWeek((offset) => offset - 1)} />
            <Button disabled={weekOffset === 0} size="sm" onClick={() => setWeek(() => 0)}>
              This week
            </Button>
            <IconButton icon="chevron-right" label="Next week" variant="quiet" onClick={() => setWeek((offset) => offset + 1)} />
          </div>
          <p className="week-head-meta">
            {schedule ? (
              <>
                <span className="mono">{formatHourRange(schedule).replace('-', '–')}</span>
                <span>{schedule.slotDurationMin}-minute slots</span>
                <span>{formatWorkingDays(schedule.workingDays).replace('-', '–')}</span>
                {formatBreak(schedule) && (
                  <span>
                    Break <span className="mono">{formatBreak(schedule)?.replace('-', '–')}</span>
                  </span>
                )}
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </p>
          <p className="week-label">{weekLabel}</p>
        </header>

        {!withPane && doctor && schedule && !moving && (
          <div className="week-strip">
            <span className="num">
              <strong>{counts.booked}</strong> booked · <strong>{counts.available}</strong> open
            </span>
            {nextOpen && (
              <Button iconAfter="arrow-right" locked={readOnly} size="sm" variant="primary" onClick={() => setBooking(nextOpen)}>
                Next open {weekdayShort(nextOpen.day)} {nextOpen.time}
              </Button>
            )}
          </div>
        )}

        {moving && (
          <div className="move-banner" role="status">
            <Icon name="move" size={18} />
            <p>
              Moving <strong>{moving.patientName}</strong> from {mediumDate(new Date(moving.appointmentTime))},{' '}
              {timeOf(new Date(moving.appointmentTime))}. Pick an open slot. Any doctor, any week.
            </p>
            <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>
              Stop moving
            </Button>
          </div>
        )}

        {dayMode && days.length > 0 && schedule && (
          <div className="day-tabs">
            <Segmented
              label="Day"
              options={days.map((day, index) => ({
                value: index,
                label: (
                  <span className="day-tab">
                    {weekdayShort(day)} <span className="num">{dayOfMonth(day)}</span>
                  </span>
                ),
              }))}
              value={shownDay}
              onChange={(index) => setDayChoice({ week: weekKey, index })}
            />
          </div>
        )}

        <div className="week-body">{body}</div>
      </section>

      {withPane && dataReady && (
        <aside aria-label={selected ? 'Appointment' : 'Week summary'} className="reception-pane">
          {selected ? (
            details(false)
          ) : (
            <WeekSummary
              counts={counts}
              doctor={doctor}
              hasSchedule={Boolean(schedule)}
              nextOpen={nextOpen}
              weekOffset={weekOffset}
              onBook={setBooking}
              onWeek={(offset) => setWeek(() => offset)}
            />
          )}
        </aside>
      )}

      {!withPane && selected && !moving && !cancelling && (
        <Dialog eyebrow="Appointment" title={selected.patientName} variant="sheet" onClose={() => select(null)}>
          {details(true)}
        </Dialog>
      )}

      {picking && (
        <Dialog size="sm" title="Choose a doctor" onClose={() => setPicking(false)}>
          <DoctorList doctors={bookable} now={now} selectedId={doctorId} onSelect={chooseDoctor} />
        </Dialog>
      )}

      {booking && doctor && (
        <BookingDialog
          doctor={doctor}
          slot={booking}
          slotMinutes={schedule?.slotDurationMin || 30}
          onBooked={(at) => {
            setBooking(null)
            onMemory((current) => ({ ...current, selectedId: null }))
            setMadeAt(at.getTime())
          }}
          onClose={() => setBooking(null)}
        />
      )}

      {cancelling && <CancelDialog appointment={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  )
}
