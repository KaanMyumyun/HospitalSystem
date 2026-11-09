import { useCallback, useEffect, useState } from 'react'
import { clearSession, sessionExpiredEvent } from './api/client'
import { useHashRoute, useSession } from './app/hooks'
import { WorkspaceProvider } from './app/workspace'
import { hasScreens } from './lib/routes'
import { NoAccess } from './screens/misc/NoAccess'
import { NotFound } from './screens/misc/NotFound'
import { SignIn } from './screens/signin/SignIn'
import { Shell } from './shell/Shell'
import type { Session } from './types'
import { useToasts } from './ui/useToasts'

export function App() {
  const { session, epoch, begin, end } = useSession()
  const [route, , navigate] = useHashRoute()
  const [notice, setNotice] = useState<string | null>(null)
  const toast = useToasts()

  useEffect(() => {
    const expired = () => {
      end()
      toast.clear()
      setNotice('Your session ended. Sign in again to carry on where you were.')
    }
    window.addEventListener(sessionExpiredEvent, expired)
    return () => window.removeEventListener(sessionExpiredEvent, expired)
  }, [end, toast])

  const signOut = useCallback(() => {
    clearSession()
    end()
    toast.clear()
    setNotice(null)
  }, [end, toast])

  const signIn = useCallback(
    (next: Session) => {
      setNotice(null)
      begin(next)
    },
    [begin],
  )

  useEffect(() => {
    if (!session) document.title = 'Sign in · Hospital System'
  }, [session])

  const pathname = window.location.pathname
  if (pathname !== '/' && pathname !== '' && pathname !== '/index.html') return <NotFound />
  if (!session) return <SignIn notice={notice} onSignedIn={signIn} />
  if (!hasScreens(session.role)) return <NoAccess role={session.role} onSignOut={signOut} />

  return (
    <WorkspaceProvider epoch={epoch} key={session.id} navigate={navigate} session={session}>
      <Shell navigate={navigate} route={route} onSignOut={signOut} />
    </WorkspaceProvider>
  )
}
