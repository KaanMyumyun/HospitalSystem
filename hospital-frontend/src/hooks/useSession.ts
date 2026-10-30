import { useCallback, useEffect, useRef, useState } from 'react'
import { getStoredSession, renewSessionIfDue } from '../api'
import type { Session } from '../types'

// The signed-in user. epoch goes up at every sign-in and sign-out, so work
// that started in one session can tell, when it finishes, that it no longer
// belongs.
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

  // Someone at the computer keeps the session going, even on a screen that
  // sends no requests; renewSessionIfDue does nothing until it is due.
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
