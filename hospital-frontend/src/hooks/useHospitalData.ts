import { useCallback, useEffect, useRef, useState } from 'react'
import { loadHospitalData } from '../api'
import { usesHospitalData } from '../lib/routes'
import type { HospitalData, Session } from '../types'

const emptyData: HospitalData = {
  departments: [],
  doctors: [],
  schedules: [],
}

export function useHospitalData(
  session: Session | null,
  onLoaded: (data: HospitalData) => void,
  onError: (message: string) => void,
) {
  const [data, setData] = useState<HospitalData>(emptyData)
  const [loading, setLoading] = useState(() => session !== null && usesHospitalData(session.role))
  const refreshRequest = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    if (!session || !usesHospitalData(session.role)) return

    refreshRequest.current?.abort()
    const request = new AbortController()
    refreshRequest.current = request

    return loadHospitalData(request.signal)
      .then((nextData) => {
        if (request.signal.aborted) return
        setData(nextData)
        onLoaded(nextData)
      })
      .catch((refreshError) => {
        if (request.signal.aborted) return
        onError(refreshError instanceof Error ? refreshError.message : 'Failed to load backend data')
      })
      .finally(() => {
        if (refreshRequest.current === request) setLoading(false)
      })
  }, [session, onLoaded, onError])

  const clear = useCallback(() => {
    refreshRequest.current?.abort()
    setData(emptyData)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, setLoading, refresh, clear }
}
