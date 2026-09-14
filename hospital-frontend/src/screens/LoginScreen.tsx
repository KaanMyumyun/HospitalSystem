import { Activity } from 'lucide-react'
import { useState } from 'react'
import { demoLogin, login } from '../api'
import { StatusBadge } from '../components/ui'
import type { Session } from '../types'

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (loginName = name, loginPassword = password) => {
    setSubmitting(true)
    setError(null)
    const result = await login(loginName, loginPassword)
    setSubmitting(false)

    if (!result.isSuccess || !result.token || !result.role) {
      setError(result.error ?? 'Invalid credentials')
      return
    }

    onLogin({ token: result.token, role: result.role })
  }

  const submitDemo = async (role: 'DemoAdmin' | 'DemoFrontDesk') => {
    setSubmitting(true)
    setError(null)
    const result = await demoLogin(role)
    setSubmitting(false)

    if (!result.isSuccess || !result.token || !result.role) {
      setError(result.error ?? 'Invalid credentials')
      return
    }

    onLogin({ token: result.token, role: result.role })
  }

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
          <label>
            Username
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-row">
          <button className="secondary-button" type="button" onClick={() => void submitDemo('DemoAdmin')}>
            Demo Admin
          </button>
          <button className="secondary-button" type="button" onClick={() => void submitDemo('DemoFrontDesk')}>
            Demo Reception
          </button>
        </div>
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
