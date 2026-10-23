import { useCallback, useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

// The address after the #, kept in step with the back and forward buttons.
// navigate adds a history entry; with replace it corrects the current one.
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
