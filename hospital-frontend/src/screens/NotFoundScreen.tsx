import { Activity } from 'lucide-react'

export function NotFoundScreen() {
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
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
        </div>

        <a className="primary-button" href="/">
          Back to home
        </a>
      </section>
    </main>
  )
}
