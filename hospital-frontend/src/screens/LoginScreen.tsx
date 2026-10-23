import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { demoLogin, login, wakeApi } from '../api'
import type { LoginResult } from '../api'
import { StatusBadge } from '../components/ui'
import type { Session } from '../types'

type PendingSignIn = 'password' | 'DemoAdmin' | 'DemoFrontDesk'

// Sign-in normally answers within a second; after this long, say why it may not.
const slowSignInMs = 3000

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  // Which button is waiting for the API; all of them are disabled meanwhile.
  const [pending, setPending] = useState<PendingSignIn | null>(null)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An idle API starts while the visitor reads the page, not on the first click.
  useEffect(() => {
    wakeApi()
  }, [])

  const signIn = async (kind: PendingSignIn, request: () => Promise<LoginResult>) => {
    setPending(kind)
    setError(null)
    const slowTimer = setTimeout(() => setSlow(true), slowSignInMs)
    const result = await request()
    clearTimeout(slowTimer)
    setSlow(false)
    setPending(null)

    if (!result.isSuccess || !result.token || !result.role) {
      setError(result.error ?? 'Invalid credentials')
      return
    }

    onLogin({ token: result.token, role: result.role })
  }

  const submit = () => signIn('password', () => login(name, password))
  const submitDemo = (role: 'DemoAdmin' | 'DemoFrontDesk') => signIn(role, () => demoLogin(role))

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand compact-brand">
          <div className="brand-mark">
            <Activity size={20} />
          </div>
          <div>
            <strong>Hospital System</strong>
            <span>Staff operations</span>
          </div>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Secure access</p>
          <h1>Staff sign in</h1>
          <p>Use your hospital account to continue.</p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          {/* name and autocomplete let password managers fill the form. */}
          <label>
            Username
            <input
              autoCapitalize="none"
              autoComplete="username"
              maxLength={50}
              name="username"
              required
              spellCheck={false}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="primary-button" disabled={pending !== null} type="submit">
            {pending === 'password' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-row">
          <button
            className="secondary-button"
            disabled={pending !== null}
            type="button"
            onClick={() => void submitDemo('DemoAdmin')}
          >
            {pending === 'DemoAdmin' ? 'Signing in...' : 'Demo Admin'}
          </button>
          <button
            className="secondary-button"
            disabled={pending !== null}
            type="button"
            onClick={() => void submitDemo('DemoFrontDesk')}
          >
            {pending === 'DemoFrontDesk' ? 'Signing in...' : 'Demo Reception'}
          </button>
        </div>
        {slow && (
          <p className="login-note" role="status">
            Waking up the server. After a quiet spell, the first sign-in can take up to a minute.
          </p>
        )}
      </section>

      <section className="login-preview" aria-hidden="true">
        <div className="preview-shell">
          <div className="preview-main">
            <div className="preview-top">
              <div>
                <p className="eyebrow">Today</p>
                <strong>Clinic flow</strong>
              </div>
              <StatusBadge tone="success">Live</StatusBadge>
            </div>
            <div className="preview-board">
              <div className="preview-card">
                <span className="doctor-avatar">C</span>
                <div>
                  <strong>Chen</strong>
                  <small>Next slot 09:40</small>
                </div>
              </div>
              <div className="preview-card">
                <span className="doctor-avatar">S</span>
                <div>
                  <strong>Sarah</strong>
                  <small>Orthopedics</small>
                </div>
              </div>
            </div>
            <div className="preview-grid">
              {Array.from({ length: 12 }, (_, index) => (
                <span className={index % 5 === 0 ? 'booked' : index % 7 === 0 ? 'cancelled' : ''} key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
