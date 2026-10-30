import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { removeLegacySession, restoreClinicTimeZone } from './api'

removeLegacySession()
restoreClinicTimeZone()

// A tab opened before a deploy can ask for a screen's code under a name the
// new release no longer has. Loading the page again fetches the new release,
// and the session survives it. At most once a minute, so a broken release
// cannot reload forever.
const reloadedAtKey = 'hospital-frontend-reloaded-for-update'
window.addEventListener('vite:preloadError', () => {
  const reloadedAt = Number(sessionStorage.getItem(reloadedAtKey))
  if (Date.now() - reloadedAt < 60_000) return
  sessionStorage.setItem(reloadedAtKey, String(Date.now()))
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
