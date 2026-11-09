import { useEffect } from 'react'
import { Wordmark } from '../../shell/Rail'
import { Icon } from '../../ui/Icon'
import '../signin/signin.css'

export function NotFound() {
  useEffect(() => {
    document.title = 'Page not found · Hospital System'
  }, [])

  return (
    <main className="center-page">
      <div className="center-card">
        <Wordmark />
        <p className="center-code display">404</p>
        <h1 className="center-title">There's no page at this address</h1>
        <p className="center-text">It may have moved, or the link was mistyped.</p>
        <a className="btn btn-primary btn-md" href="/">
          Back to the app
          <Icon name="arrow-right" size={17} />
        </a>
      </div>
    </main>
  )
}
