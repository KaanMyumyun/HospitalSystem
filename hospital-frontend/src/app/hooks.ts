import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getStoredSession, renewSessionIfDue } from '../api/client'
import { parseHash } from '../lib/routes'
import type { Session } from '../types'

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash)
  const navigate = useCallback((next: string, replace = false) => {
    if (next === window.location.hash) return
    if (!replace) {
      window.location.hash = next
      return
    }
    history.replaceState(history.state, '', next)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [])
  return [parseHash(hash), hash, navigate] as const
}

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = setInterval(tick, intervalMs)
    const wake = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', wake)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [intervalMs])
  return now
}

export function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export type ThemeChoice = 'system' | 'light' | 'dark'
const themeKey = 'hospital-frontend-theme'

function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(themeKey)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function applyStoredTheme() {
  const choice = readTheme()
  if (choice === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = choice
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme)
  useEffect(() => {
    if (choice === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = choice
    try {
      if (choice === 'system') localStorage.removeItem(themeKey)
      else localStorage.setItem(themeKey, choice)
    } catch {
      return
    }
  }, [choice])
  return [choice, setChoice] as const
}

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

export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
