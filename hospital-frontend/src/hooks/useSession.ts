import { useCallback, useEffect, useRef, useState } from 'react'
import { getStoredSession, renewSessionIfDue } from '../api'
import type { Session } from '../types'

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession())
  const epoch = useRef(0)

  const begin = useCallback((next: Session) => {
    epoch.current++
    setSession(next)
  }, [])

  const end = useCallback(() => {
    epoch.current++
    setSession(null)
  }, [])

  useEffect(() => {
    if (!session) return
    const renew = () => void renewSessionIfDue()
    const events = ['pointerdown', 'keydown'] as const
    for (const event of events) window.addEventListener(event, renew, { passive: true })
    return () => {
      for (const event of events) window.removeEventListener(event, renew)
    }
  }, [session])

  return { session, epoch, begin, end }
}
