import { useCallback, useEffect, useRef, useState } from 'react'
import { loadUsers } from '../api'
import type { UsersPage } from '../api'

type LoadedPage = { search: string; page: number; result: UsersPage }

const searchDelayMs = 300

// One page of users, searched on the server as the admin types. Nothing loads
// while disabled; onError must keep the same identity.
export function useUsersPage(enabled: boolean, searchQuery: string, onError: (message: string) => void) {
  const search = useDebouncedValue(searchQuery.trim(), searchDelayMs)
  const [requested, setRequested] = useState({ search: '', page: 1 })
  // A new search starts again from its first page.
  const page = requested.search === search ? requested.page : 1
  const [loaded, setLoaded] = useState<LoadedPage | null>(null)
  const [wasEnabled, setWasEnabled] = useState(enabled)
  const latestRequest = useRef<symbol | null>(null)

  // Discard cached users before rendering a disabled or newly enabled view.
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled)
    setLoaded(null)
  }

  const reload = useCallback(async () => {
    const request = Symbol()
    latestRequest.current = request
    if (!enabled) return

    return loadUsers(search, page).then(
      (result) => {
        if (request === latestRequest.current) setLoaded({ search, page, result })
      },
      (error: unknown) => {
        if (request === latestRequest.current) {
          onError(error instanceof Error ? error.message : 'Failed to load users')
        }
      },
    )
  }, [enabled, search, page, onError])

  useEffect(() => {
    void reload()
    return () => { latestRequest.current = null }
  }, [reload])

  const setPage = useCallback((next: number) => setRequested({ search, page: next }), [search])
  const isShownPage = loaded !== null && loaded.search === search && loaded.page === page

  // The previous page stays on screen while the next one loads.
  return { usersPage: enabled ? loaded?.result ?? null : null, isLoading: enabled && !isShownPage, setPage, reload }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
