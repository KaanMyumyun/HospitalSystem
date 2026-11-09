import { useEffect, useRef, useState } from 'react'
import { demoLogin, getStoredSession, login, wakeApi } from '../../api/client'
import type { LoginResult } from '../../api/client'
import { useNow } from '../../app/hooks'
import { PasswordInput } from '../../components/PasswordInput'
import { greeting, longDate, timeOf } from '../../lib/dates'
import { Wordmark } from '../../shell/Rail'
import type { Session } from '../../types'
import { Button } from '../../ui/Button'
import { Field, FormError } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import './signin.css'

type Pending = 'password' | 'DemoAdmin' | 'DemoFrontDesk'

const slowAfterMs = 3000

export function SignIn({ notice, onSignedIn }: { notice: string | null; onSignedIn: (session: Session) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [slow, setSlow] = useState(false)
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = useNow(20_000)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    wakeApi()
    return () => {
      mounted.current = false
    }
  }, [])

  const attempt = async (kind: Pending, request: () => Promise<LoginResult>) => {
    setPending(kind)
    setError(null)
    const timer = setTimeout(() => setSlow(true), slowAfterMs)
    const result = await request()
    clearTimeout(timer)
    if (!mounted.current) return
    setSlow(false)
    setPending(null)
    const session = result.isSuccess ? getStoredSession() : null
    if (!session) {
      setError(result.error ?? 'That username and password did not match.')
      return
    }
    onSignedIn(session)
  }

  const submit = () => {
    setTried(true)
    if (!name.trim() || !password) return
    void attempt('password', () => login(name.trim(), password))
  }

  return (
    <main className="signin">
      <section className="signin-poster">
        <div className="poster-brand">
          <Wordmark />
        </div>
        <div className="poster-copy">
          <p className="poster-date">
            {longDate(now)}
            <span className="poster-time mono">{timeOf(now)}</span>
          </p>
          <h1 className="poster-greeting">{greeting(now)}.</h1>
          <p className="poster-lede">
            Bookings, doctors' weeks and patient records for the whole clinic, on one quiet page.
          </p>
        </div>
        <PosterTimetable />
      </section>

      <section className="signin-panel">
        <div className="signin-card">
          <div className="signin-mobile-brand">
            <Wordmark />
          </div>
          <h2 className="signin-title">Sign in</h2>
          <p className="signin-sub">Use the staff account your administrator gave you.</p>

          {notice && (
            <p className="signin-notice" role="status">
              <Icon name="clock" size={16} />
              {notice}
            </p>
          )}

          <form
            className="form-grid signin-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <Field error={tried && !name.trim() ? 'Enter your username' : null} label="Username">
              {(control) => (
                <input
                  {...control}
                  autoCapitalize="none"
                  autoComplete="username"
                  className="input"
                  maxLength={50}
                  name="username"
                  spellCheck={false}
                  value={name}
                  onChange={(event) => {
                    setError(null)
                    setName(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field error={tried && !password ? 'Enter your password' : null} label="Password">
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="current-password"
                  name="password"
                  value={password}
                  onChange={(value) => {
                    setError(null)
                    setPassword(value)
                  }}
                />
              )}
            </Field>
            {error && <FormError>{error}</FormError>}
            <Button block busy={pending === 'password'} disabled={pending !== null} size="lg" type="submit" variant="primary">
              {pending === 'password' ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="signin-divider">
            <span>or look around the demo</span>
          </div>

          <div className="demo-grid">
            <DemoCard
              busy={pending === 'DemoFrontDesk'}
              disabled={pending !== null}
              text="Week calendar, bookings and patient records"
              title="Reception"
              onClick={() => void attempt('DemoFrontDesk', () => demoLogin('DemoFrontDesk'))}
            />
            <DemoCard
              busy={pending === 'DemoAdmin'}
              disabled={pending !== null}
              text="Departments, doctors and their schedules"
              title="Administration"
              onClick={() => void attempt('DemoAdmin', () => demoLogin('DemoAdmin'))}
            />
          </div>
          <p className="signin-foot">Demo accounts can look at everything and change nothing.</p>

          {slow && (
            <p className="signin-wake" role="status">
              <span className="wake-dot" aria-hidden="true" />
              Waking the server. After a quiet spell, the first sign-in can take up to a minute.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

function DemoCard({
  title,
  text,
  busy,
  disabled,
  onClick,
}: {
  title: string
  text: string
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button aria-busy={busy || undefined} className="demo-card" disabled={disabled} type="button" onClick={onClick}>
      <span className="demo-card-text">
        <span className="demo-card-title">{title}</span>
        <span className="demo-card-detail">{text}</span>
      </span>
      {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrow-right" size={18} />}
    </button>
  )
}

const posterRows = [
  ['08:00', 'b', '.', 'd', 'b', '.'],
  ['08:30', 'd', 'b', '.', 'b', 'b'],
  ['09:00', '.', 'b', 'n', '.', 'b'],
  ['09:30', 'b', '.', 'b', 'a', '.'],
  ['10:00', 'h', 'h', 'h', 'a', 'h'],
  ['10:30', 'b', 'b', '.', 'a', 'd'],
  ['11:00', '.', 'd', 'b', 'a', '.'],
]

function PosterTimetable() {
  return (
    <div className="poster-grid" aria-hidden="true">
      <span />
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
        <span className="poster-day" key={day}>
          {day}
        </span>
      ))}
      {posterRows.flatMap(([time, ...cells]) => [
        <span className="poster-hour mono" key={time}>
          {time}
        </span>,
        ...cells.map((cell, index) => <span className={`poster-cell poster-${cell}`} key={`${time}-${index}`} />),
      ])}
    </div>
  )
}
