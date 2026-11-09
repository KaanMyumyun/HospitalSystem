import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounced, useLatest } from './hooks'
import { useWorkspace } from './workspaceContext'

type State<T> = { key: string; data?: T; error?: string }

export function useResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
  options: { keepPrevious?: boolean } = {},
) {
  const { register } = useWorkspace()
  const loader = useLatest(load)
  const [state, setState] = useState<State<T> | null>(null)
  const controller = useRef<AbortController | null>(null)

  const reload = useCallback(() => {
    if (key === null) return Promise.resolve()
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    return loader.current(request.signal).then(
      (data) => {
        if (!request.signal.aborted) setState({ key, data })
      },
      (error: unknown) => {
        if (request.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Could not load this'
        setState((current) =>
          current?.key === key && current.data !== undefined ? { ...current, error: message } : { key, error: message },
        )
      },
    )
  }, [key, loader])

  useEffect(() => {
    void reload()
    return () => controller.current?.abort()
  }, [reload])

  useEffect(() => register(reload), [register, reload])

  const current = state?.key === key ? state : null
  const previous = options.keepPrevious && key !== null && !current && state?.data !== undefined ? state.data : undefined
  return {
    data: current?.data ?? previous ?? null,
    error: current?.error ?? null,
    loading: key !== null && current?.data === undefined && current?.error === undefined,
    stale: previous !== undefined,
    reload,
  }
}

export function usePagedSearch<P>(
  name: string,
  load: (search: string, page: number, signal: AbortSignal) => Promise<P>,
  enabled = true,
) {
  const [query, setQuery] = useState('')
  const term = useDebounced(query.trim(), 300)
  const [requested, setRequested] = useState({ term: '', page: 1 })
  const page = requested.term === term ? requested.page : 1
  const resource = useResource(enabled ? `${name}:${term}:${page}` : null, (signal) => load(term, page, signal), {
    keepPrevious: true,
  })
  return {
    ...resource,
    query,
    setQuery,
    term,
    page,
    setPage: (next: number) => setRequested({ term, page: next }),
    searching: query.trim() !== term,
  }
}
