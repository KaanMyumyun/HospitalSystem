import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAppointments } from '../api'
import type { AppointmentDto } from '../api'
import { weekRange } from '../lib/schedule'

type LoadedWeek = { doctorId: number; fromMs: number; appointments: AppointmentDto[] }

// The selected doctor's appointments for the week on screen. appointments is
// null until that week has loaded; onError must keep the same identity.
export function useWeekAppointments(
  doctorId: number | null,
  weekOffset: number,
  onError: (message: string) => void,
) {
  // Keyed by the week's real start: weekOffset 0 means a new week after
  // Monday midnight, and a tab left open must not keep last week's bookings.
  const { from, to } = weekRange(weekOffset)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const [loaded, setLoaded] = useState<LoadedWeek | null>(null)
  const [previousDoctorId, setPreviousDoctorId] = useState(doctorId)
  const latestRequest = useRef<symbol | null>(null)

  // A cleared or changed doctor selection must discard cached appointments.
  if (previousDoctorId !== doctorId) {
    setPreviousDoctorId(doctorId)
    setLoaded(null)
  }

  const reload = useCallback(async () => {
    const request = Symbol()
    latestRequest.current = request
    if (doctorId === null) return

    return loadAppointments(doctorId, new Date(fromMs), new Date(toMs)).then(
      (appointments) => {
        // The desk may have moved to another doctor or week meanwhile.
        if (request === latestRequest.current) setLoaded({ doctorId, fromMs, appointments })
      },
      (error: unknown) => {
        if (request === latestRequest.current) {
          onError(error instanceof Error ? error.message : 'Failed to load appointments')
        }
      },
    )
  }, [doctorId, fromMs, toMs, onError])

  useEffect(() => {
    void reload()
    return () => { latestRequest.current = null }
  }, [reload])

  const isShownWeek = loaded !== null && loaded.doctorId === doctorId && loaded.fromMs === fromMs
  return { appointments: isShownWeek ? loaded.appointments : null, reload }
}
