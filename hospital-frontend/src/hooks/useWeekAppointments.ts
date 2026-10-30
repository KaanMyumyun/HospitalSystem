import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAppointments } from '../api'
import type { AppointmentDto } from '../api'
import { weekRange } from '../lib/schedule'

type LoadedWeek = { doctorId: number; fromMs: number; appointments: AppointmentDto[] }

export function useWeekAppointments(
  doctorId: number | null,
  weekOffset: number,
  onError: (message: string) => void,
) {
  const { from, to } = weekRange(weekOffset)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const [loaded, setLoaded] = useState<LoadedWeek | null>(null)
  const [previousDoctorId, setPreviousDoctorId] = useState(doctorId)
  const latestRequest = useRef<symbol | null>(null)

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
