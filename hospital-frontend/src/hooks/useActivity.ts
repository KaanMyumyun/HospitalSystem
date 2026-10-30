import { useCallback, useEffect, useState } from 'react'
import { newId } from '../lib/id'
import type { ActivityEntry } from '../types'

const storageKey = 'hospital-frontend-activity'

function storedActivity(): ActivityEntry[] {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ActivityEntry[]
  } catch {
    return []
  }
}

// Recent activity on the admin screens: the last eight changes made in this
// browser, kept across reloads. App clears it when someone signs in or out.
export function useActivity() {
  const [activity, setActivity] = useState<ActivityEntry[]>(storedActivity)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(activity))
  }, [activity])

  const record = useCallback((message: string) => {
    setActivity((current) => [{ id: newId(), message, at: new Date().toISOString() }, ...current].slice(0, 8))
  }, [])
  const clear = useCallback(() => setActivity([]), [])

  return { activity, record, clear }
}
