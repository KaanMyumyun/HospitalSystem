import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      TZ: 'UTC',
    },
    // Playwright runs those (npm run e2e).
    exclude: [...configDefaults.exclude, 'e2e/**'],
    projects: [
      // Logic, in Node: *.test.ts.
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      // Components rendered into jsdom: *.test.tsx.
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
})
