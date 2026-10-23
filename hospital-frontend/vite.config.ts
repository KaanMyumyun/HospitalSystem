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

export default defineConfig(({ mode }) => ({
  plugins: [react(), notFoundPage(), contentSecurityPolicy(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL)],
  // Production stack traces point at the source. The code is public anyway,
  // and browsers fetch the maps only with developer tools open.
  build: { sourcemap: true },
}))
