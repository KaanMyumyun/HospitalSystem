import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Cloudflare Pages answers every unknown path with index.html and a 200 unless
// the build has a top-level 404.html. With this copy of the app shell, unknown
// paths get a real 404 and the app shows its not-found screen, as nginx.conf
// does for the Docker image.
function notFoundPage(): Plugin {
  return {
    name: 'not-found-page',
    apply: 'build',
    async writeBundle({ dir }) {
      if (dir) await copyFile(join(dir, 'index.html'), join(dir, '404.html'))
    },
  }
}

// The page may run scripts and load styles only from its own origin, and send
// requests only to itself and the API this build calls. It is a meta tag, so
// every host serves it, and the build knows the API's origin (VITE_API_URL).
// frame-ancestors cannot go in a meta tag; X-Frame-Options covers framing.
function contentSecurityPolicy(apiUrl: string | undefined): Plugin {
  const apiOrigin = originOf(apiUrl?.trim() || 'http://localhost:5272/api')
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

// Null for a relative URL such as /api, which is the page's own origin.
function originOf(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// The API's address is built into the bundle. Without VITE_API_URL a
// production build would send every visitor's requests to localhost, so it
// stops instead. CI builds only to check that the app compiles; there a
// warning is enough. A Docker build does not see CI, so a missing build
// argument fails the image.
function requireApiUrl(apiUrl: string | undefined) {
  if (apiUrl?.trim()) return
  const message =
    'VITE_API_URL is not set, so this build would call the API at http://localhost:5272/api. ' +
    'Set it to the API the build is for, for example VITE_API_URL=http://localhost:5272/api npm run build.'
  if (!process.env.CI) throw new Error(message)
  console.warn(`Warning: ${message}`)
}

export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL
  if (command === 'build' && mode === 'production') requireApiUrl(apiUrl)

  return {
    plugins: [react(), notFoundPage(), contentSecurityPolicy(apiUrl)],
    // Production stack traces point at the source. The code is public anyway,
    // and browsers fetch the maps only with developer tools open.
    build: { sourcemap: true },
  }
})
