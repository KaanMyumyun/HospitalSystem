import { useMemo } from 'react'
import * as api from '../api'
import type { AppointmentDto, CreateAppointmentInput, DoctorDto, UpdatePatientInput } from '../api'
import type { ConfirmOptions } from '../components/ui'
import { formatLongDate, formatTime } from '../lib/format'
import type { ActionOutcome } from '../types'
import type { RunAction } from './useActionRunner'

export type DeskActions = {
  bookAppointment: (input: CreateAppointmentInput) => Promise<ActionOutcome>
  cancelAppointment: (appointmentId: number, reason: string) => Promise<ActionOutcome>
  markAppointment: (appointmentId: number, status: 'Completed' | 'NoShow') => Promise<ActionOutcome>
  moveAppointment: (appointment: AppointmentDto, appointmentTime: Date, doctor: DoctorDto) => Promise<ActionOutcome>
  updatePatient: (patientId: number, input: UpdatePatientInput) => Promise<ActionOutcome>
}

export function useDeskActions(
  runAction: RunAction,
  confirm: (options: ConfirmOptions) => Promise<boolean>,
): DeskActions {
  return useMemo<DeskActions>(
    () => ({
      bookAppointment: (input) => runAction(() => api.createAppointment(input), 'Appointment booked'),
      cancelAppointment: (appointmentId, reason) =>
        runAction(() => api.cancelAppointment(appointmentId, reason), 'Appointment cancelled'),
      markAppointment: (appointmentId, status) =>
        runAction(
          () => api.changeAppointmentStatus(appointmentId, status),
          status === 'Completed' ? 'Appointment marked completed' : 'Appointment marked no-show',
        ),
      moveAppointment: async (appointment, appointmentTime, doctor) => {
        const otherDoctor = doctor.doctorId !== appointment.doctorId
        const confirmed = await confirm({
          title: 'Move appointment',
          message: `Move ${appointment.patientName}'s appointment to ${formatLongDate(appointmentTime)} at ${formatTime(appointmentTime)}${otherDoctor ? ` with ${doctor.name}` : ''}?`,
          confirmLabel: 'Move appointment',
        })
        if (!confirmed) return { ok: false }
        return runAction(
          () => api.moveAppointment(appointment.appointmentId, appointmentTime, otherDoctor ? doctor.doctorId : undefined),
          'Appointment moved',
        )
      },
      updatePatient: (patientId, input) => runAction(() => api.updatePatient(patientId, input), 'Patient details saved'),
    }),
    [confirm, runAction],
  )
}
