import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMediaQuery, useTheme } from '../app/hooks'
import { useWorkspace } from '../app/workspaceContext'
import { ChangePasswordDialog } from '../components/ChangePasswordDialog'
import { hashFor, screenFor, screenPaths, screenTitles } from '../lib/routes'
import type { Route } from '../lib/routes'
import type { Screen } from '../types'
import { IconButton } from '../ui/Button'
import { Skeleton } from '../ui/bits'
import { CommandPalette } from './CommandPalette'
import type { Command } from './CommandPalette'
import { Rail, Wordmark } from './Rail'
import { deskFromParams } from '../screens/reception/deskParams'
import type { DeskMemory } from '../screens/reception/deskParams'

const Reception = lazy(() => import('../screens/reception/Reception').then((module) => ({ default: module.Reception })))
const Patients = lazy(() => import('../screens/patients/Patients').then((module) => ({ default: module.Patients })))
const MyDay = lazy(() => import('../screens/myday/MyDay').then((module) => ({ default: module.MyDay })))
const Departments = lazy(() => import('../screens/admin/Departments').then((module) => ({ default: module.Departments })))
const Doctors = lazy(() => import('../screens/admin/Doctors').then((module) => ({ default: module.Doctors })))
const Schedules = lazy(() => import('../screens/admin/Schedules').then((module) => ({ default: module.Schedules })))
const Users = lazy(() => import('../screens/admin/Users').then((module) => ({ default: module.Users })))
const AuditLog = lazy(() => import('../screens/admin/AuditLog').then((module) => ({ default: module.AuditLog })))

export type ScreenProps = { params: URLSearchParams; clearParams: () => void }

export function Shell({
  route,
  navigate,
  onSignOut,
}: {
  route: Route
  navigate: (hash: string, replace?: boolean) => void
  onSignOut: () => void
}) {
  const { session, refresh, readOnly, toast } = useWorkspace()
  const screen = screenFor(session.role, route.path)
  const [theme, setTheme] = useTheme()
  const [palette, setPalette] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [desk, setDesk] = useState<DeskMemory>({ doctorId: null, weekOffset: 0, selectedId: null })
  const [appliedParams, setAppliedParams] = useState('')
  const wide = useMediaQuery('(min-width: 1024px)')
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    if (route.path !== screenPaths[screen]) navigate(hashFor(screen), true)
  }, [route.path, screen, navigate])

  useEffect(() => {
    document.title = `${screenTitles[screen]} · Hospital System`
  }, [screen])

  useEffect(() => {
    if (readOnly) toast.info('This is a read-only demo. Look around freely; changes are switched off.')
  }, [readOnly, toast])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shownScreen = useRef(screen)
  useEffect(() => {
    if (shownScreen.current === screen) return
    shownScreen.current = screen
    main.current?.focus({ preventScroll: true })
    main.current?.scrollTo?.({ top: 0 })
  }, [screen])

  const clearParams = useCallback(() => navigate(hashFor(screen), true), [navigate, screen])
  const deskParams = screen === 'reception' ? route.params.toString() : ''
  if (deskParams !== appliedParams) {
    setAppliedParams(deskParams)
    if (deskParams) setDesk((current) => deskFromParams(current, new URLSearchParams(deskParams)))
  }

  useEffect(() => {
    if (deskParams) clearParams()
  }, [deskParams, clearParams])

  const actions = useMemo<Command[]>(
    () => [
      { id: 'refresh', group: 'Actions', label: 'Refresh data', icon: 'refresh', keywords: 'reload update', run: () => void refresh() },
      {
        id: 'theme',
        group: 'Actions',
        label: theme === 'dark' ? 'Use the light theme' : 'Use the dark theme',
        icon: theme === 'dark' ? 'sun' : 'moon',
        keywords: 'theme colour color appearance night',
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      ...(theme !== 'system'
        ? [{ id: 'theme-system', group: 'Actions', label: 'Match the system theme', icon: 'monitor' as const, keywords: 'theme auto', run: () => setTheme('system') }]
        : []),
      ...(readOnly
        ? []
        : [{ id: 'password', group: 'Actions', label: 'Change my password', icon: 'key' as const, keywords: 'account security', run: () => setChangingPassword(true) }]),
      { id: 'signout', group: 'Actions', label: 'Sign out', icon: 'logout', keywords: 'log out leave', run: onSignOut },
    ],
    [refresh, theme, setTheme, readOnly, onSignOut],
  )

  const rail = (onNavigate?: () => void) => (
    <Rail
      screen={screen}
      theme={theme}
      onChangePassword={() => setChangingPassword(true)}
      onNavigate={onNavigate}
      onSearch={() => setPalette(true)}
      onSignOut={onSignOut}
      onTheme={setTheme}
    />
  )

  const props: ScreenProps = { params: route.params, clearParams }

  return (
    <div className="shell">
      <button className="skip-link" type="button" onClick={() => main.current?.focus()}>
        Skip to content
      </button>
      {wide ? (
        <aside className="rail">{rail()}</aside>
      ) : (
        <header className="topbar">
          <IconButton icon="menu" label="Open menu" onClick={() => setDrawer(true)} />
          <a className="topbar-brand" href={hashFor(screen)}>
            <Wordmark />
          </a>
          <IconButton icon="search" label="Search" onClick={() => setPalette(true)} />
        </header>
      )}

      <main className="main" id="main" ref={main} tabIndex={-1}>
        <Suspense fallback={<ScreenFallback screen={screen} />}>
          {screen === 'reception' && <Reception {...props} memory={desk} onMemory={setDesk} />}
          {screen === 'patients' && <Patients {...props} />}
          {screen === 'doctor' && <MyDay {...props} />}
          {screen === 'departments' && <Departments {...props} />}
          {screen === 'doctors' && <Doctors {...props} />}
          {screen === 'schedules' && <Schedules {...props} />}
          {screen === 'users' && <Users {...props} />}
          {screen === 'audit' && <AuditLog {...props} />}
        </Suspense>
      </main>

      {drawer && !wide && <NavDrawer onClose={() => setDrawer(false)}>{rail(() => setDrawer(false))}</NavDrawer>}
      {palette && <CommandPalette actions={actions} onClose={() => setPalette(false)} />}
      {changingPassword && <ChangePasswordDialog onClose={() => setChangingPassword(false)} />}
    </div>
  )
}

function ScreenFallback({ screen }: { screen: Screen }) {
  return (
    <div className="page" aria-busy="true">
      <header className="page-head">
        <h1 className="page-title">{screenTitles[screen]}</h1>
      </header>
      <div className="page-body">
        <Skeleton lines={6} />
      </div>
    </div>
  )
}

function NavDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const backdrop = (event: MouseEvent) => {
      if (event.target === dialog) close.current()
    }
    dialog.addEventListener('click', backdrop)
    return () => {
      dialog.removeEventListener('click', backdrop)
      if (dialog.open) dialog.close()
    }
  }, [])
  return (
    <dialog
      aria-label="Menu"
      className="drawer"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <IconButton className="drawer-close" icon="close" label="Close menu" onClick={onClose} />
      {children}
    </dialog>
  )
}
