import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/onest/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/tokens.css'
import './styles/base.css'
import './ui/ui.css'
import './shell/shell.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { removeLegacySession, restoreClinicTimeZone } from './api/client'
import { applyStoredTheme } from './app/hooks'
import { ToastProvider } from './ui/Toasts'

removeLegacySession()
restoreClinicTimeZone()
applyStoredTheme()

const reloadedAtKey = 'hospital-frontend-reloaded-for-update'
window.addEventListener('vite:preloadError', () => {
  try {
    const reloadedAt = Number(sessionStorage.getItem(reloadedAtKey))
    if (Date.now() - reloadedAt < 60_000) return
    sessionStorage.setItem(reloadedAtKey, String(Date.now()))
  } catch {
    return
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
