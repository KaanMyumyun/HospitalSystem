import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
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

export default defineConfig({
  plugins: [react(), notFoundPage()],
})
