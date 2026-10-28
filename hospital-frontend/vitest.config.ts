import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      TZ: 'UTC',
    },
    // Playwright runs those (npm run e2e).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
