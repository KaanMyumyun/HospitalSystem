import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      TZ: 'UTC',
    },
    exclude: [...configDefaults.exclude, 'e2e/**'],
    projects: [
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
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
