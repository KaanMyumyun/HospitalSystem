import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function notFoundPage(): Plugin {
  return {
    name: 'not-found-page',
    apply: 'build',
    async writeBundle({ dir }) {
      if (dir) await copyFile(join(dir, 'index.html'), join(dir, '404.html'))
    },
  }
}

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

function originOf(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

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
    build: { sourcemap: true },
  }
})
