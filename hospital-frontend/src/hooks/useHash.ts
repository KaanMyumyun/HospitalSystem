import { useCallback, useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHash() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)

  const navigate = useCallback((next: string, replace = false) => {
    if (!replace) {
      window.location.hash = next
      return
    }
    history.replaceState(history.state, '', next)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [])

  return [hash, navigate] as const
}
