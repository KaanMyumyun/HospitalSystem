import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppointmentDto, CreateAppointmentInput, DoctorDto } from '../../api'
import { useWorkspace } from '../../hooks/useWorkspace'
import { departmentName } from '../../lib/format'
import { buildWeekSlots, dateAtTime, getNextAvailableSlot, isInWeek, shownDays, weekDays } from '../../lib/schedule'
import { filterBySearch } from '../../lib/search'
import type { ActionOutcome, Slot } from '../../types'
import { AppointmentPanel } from './AppointmentPanel'
import { BookingDialog } from './BookingDialog'
import { CancelAppointmentDialog } from './CancelAppointmentDialog'
import { DoctorPicker } from './DoctorPicker'
import { WeekCalendar } from './WeekCalendar'

// The front desk's week: a doctor on the left, their slots in the middle and
// the chosen booking on the right. Choosing an open slot books it, unless a
// booking is being moved, which then goes there.
export function ReceptionDashboard({
  appointments,
  selectedDoctor,
  selectedDoctorId,
  weekOffset,
  onCancelAppointment,
  onChangeAppointmentStatus,
  onCreateAppointment,
  onMoveAppointment,
  onSelectDoctor,
  onWeekOffsetChange,
}: {
  // The selected doctor's appointments for the week shown; null while loading.
  appointments: AppointmentDto[] | null
  selectedDoctor: DoctorDto | null
  selectedDoctorId: number | null
  weekOffset: number
  onCancelAppointment: (appointmentId: number, reason: string) => Promise<ActionOutcome>
  onChangeAppointmentStatus: (appointmentId: number, status: 'Completed' | 'NoShow') => Promise<ActionOutcome>
  onCreateAppointment: (input: CreateAppointmentInput) => Promise<ActionOutcome>
  onMoveAppointment: (appointment: AppointmentDto, appointmentTime: Date, doctor: DoctorDto) => Promise<ActionOutcome>
  onSelectDoctor: (doctorId: number) => void
  onWeekOffsetChange: Dispatch<SetStateAction<number>>
}) {
  const { departments, doctors, schedules, searchQuery } = useWorkspace()
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<number | null>(null)
  // The booking being moved. Meanwhile an open slot, of any doctor or week
  // the desk turns to, is where it goes.
  const [moving, setMoving] = useState<AppointmentDto | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<number | 'all'>('all')
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive), [departments])
  const activeDoctors = useMemo(() => {
    const activeDepartmentIds = new Set(activeDepartments.map((department) => department.id))
    const shown = doctors.filter(
      (doctor) =>
        doctor.isActive &&
        activeDepartmentIds.has(doctor.departmentId) &&
        (departmentFilter === 'all' || doctor.departmentId === departmentFilter),
    )
    return filterBySearch(shown, searchQuery, (doctor) => [doctor.name, departmentName(departments, doctor.departmentId)])
  }, [activeDepartments, departmentFilter, departments, doctors, searchQuery])
  useEffect(() => {
    const firstActiveDoctor = activeDoctors[0]
    if (firstActiveDoctor && !activeDoctors.some((doctor) => doctor.doctorId === selectedDoctorId)) {
      onSelectDoctor(firstActiveDoctor.doctorId)
    }
  }, [activeDoctors, onSelectDoctor, selectedDoctorId])
  const selectedSchedule = schedules.find((schedule) => schedule.doctorId === selectedDoctor?.doctorId)
  const days = useMemo(
    () => weekDays(weekOffset, shownDays(selectedSchedule, appointments, weekOffset)),
    [appointments, selectedSchedule, weekOffset],
  )
  const slots = useMemo(
    () => buildWeekSlots(selectedSchedule, selectedDoctor?.doctorId, appointments, weekOffset),
    [appointments, selectedDoctor?.doctorId, selectedSchedule, weekOffset],
  )
  const nextAvailableSlot = useMemo(() => getNextAvailableSlot(slots), [slots])
  const counts = useMemo(() => {
    const weekSlots = slots.flat()
    return {
      booked: weekSlots.filter((slot) => slot.status === 'booked').length,
      available: weekSlots.filter((slot) => slot.status === 'available').length,
      cancelled: (appointments ?? []).filter(
        (appointment) =>
          appointment.doctorId === selectedDoctor?.doctorId &&
          appointment.status === 'Cancelled' &&
          isInWeek(new Date(appointment.appointmentTime), weekOffset),
      ).length,
    }
  }, [appointments, selectedDoctor?.doctorId, slots, weekOffset])
  const visibleAppointment =
    appointments?.find((appointment) => appointment.appointmentId === selectedAppointmentId) ?? null
  const cancellingAppointment =
    appointments?.find((appointment) => appointment.appointmentId === cancellingAppointmentId) ?? null

  const moveTo = async (slot: Slot) => {
    if (!moving || !selectedDoctor) return
    const outcome = await onMoveAppointment(moving, dateAtTime(slot.day, slot.time), selectedDoctor)
    if (!outcome.ok) return
    setSelectedAppointmentId(moving.appointmentId)
    setMoving(null)
  }
  const chooseSlot = (slot: Slot) => {
    if (slot.appointment) {
      setSelectedAppointmentId(slot.appointment.appointmentId)
      return
    }
    if (slot.status !== 'available') return
    if (moving) void moveTo(slot)
    else setSelectedSlot(slot)
  }

  return (
    <section className="screen-grid reception-grid">
      <DoctorPicker
        activeDepartments={activeDepartments}
        departmentFilter={departmentFilter}
        doctors={activeDoctors}
        selectedDoctorId={selectedDoctorId}
        onDepartmentFilterChange={setDepartmentFilter}
        onSelectDoctor={onSelectDoctor}
      />

      <WeekCalendar
        counts={counts}
        days={days}
        doctor={selectedDoctor}
        moving={moving}
        schedule={selectedSchedule}
        slots={slots}
        onChooseSlot={chooseSlot}
        onStopMoving={() => setMoving(null)}
        onWeekOffsetChange={onWeekOffsetChange}
      />

      <AppointmentPanel
        appointment={visibleAppointment}
        doctor={selectedDoctor}
        moving={moving}
        nextAvailableSlot={nextAvailableSlot}
        onBookSlot={setSelectedSlot}
        onCancel={(appointment) => setCancellingAppointmentId(appointment.appointmentId)}
        onMark={(appointmentId, status) => void onChangeAppointmentStatus(appointmentId, status)}
        onStartMove={(appointment) => {
          setSelectedSlot(null)
          setMoving(appointment)
        }}
      />

      {selectedSlot && selectedDoctor && (
        <BookingDialog
          doctor={selectedDoctor}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onCreateAppointment={onCreateAppointment}
        />
      )}

      {cancellingAppointment && (
        <CancelAppointmentDialog
          appointment={cancellingAppointment}
          onCancelAppointment={onCancelAppointment}
          onClose={() => setCancellingAppointmentId(null)}
        />
      )}
    </section>
  )
}
