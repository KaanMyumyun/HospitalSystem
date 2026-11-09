import { weekOffsetOf } from '../../lib/schedule'

export type DeskMemory = { doctorId: number | null; weekOffset: number; selectedId: number | null }

export function deskFromParams(current: DeskMemory, params: URLSearchParams): DeskMemory {
  const doctorId = Number(params.get('doctor'))
  const at = params.get('at')
  const appointmentId = Number(params.get('appointment'))
  return {
    doctorId: doctorId || current.doctorId,
    weekOffset: at ? weekOffsetOf(new Date(at)) : current.weekOffset,
    selectedId: appointmentId || (doctorId ? null : current.selectedId),
  }
}
