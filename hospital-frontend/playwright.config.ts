import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { databaseConnection } from './e2e/database.ts'
import { apiOrigin, clinicTimeZone, webPort, webUrl } from './e2e/settings.ts'

// npm run e2e: the app in a browser against a real API and database. See
// Testing in the README for what it needs.

const buildDir = 'dist-e2e'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webUrl,
    locale: 'en-US',
    // Far from the clinic's zone, so the dates and times the tests look for
    // also show that the app keeps to the clinic's clock.
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      // The API as it runs in production. It creates and migrates the run's
      // database as it starts, as Database:RunMigrationsOnStartup does on
      // Render.
      command: 'dotnet run --no-launch-profile',
      cwd: resolve(import.meta.dirname, '../HospitalSystem'),
      url: `${apiOrigin}/health/ready`,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Production',
        DOTNET_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: apiOrigin,
        ConnectionStrings__DefaultConnection: databaseConnection(),
        ConnectionStrings__Migrations: '',
        Database__RunMigrationsOnStartup: 'true',
        // The API will not start without a signing key.
        JwtSettings__SecretKey: randomBytes(32).toString('base64'),
        Clinic__TimeZone: clinicTimeZone,
        Cors__AllowedOrigins__0: webUrl,
        // Each test sends its own client address (e2e/fixtures.ts).
        ForwardedHeaders__TrustAllProxies: 'true',
        Metrics__Port: '0',
        // Warnings and errors reach the test output; the rest stays out.
        Logging__Console__LogToStandardErrorThreshold: 'Warning',
      },
    },
    {
      // The production build, with its content security policy.
      command:
        `npx vite build --outDir ${buildDir} --emptyOutDir --logLevel warn && ` +
        `npx vite preview --outDir ${buildDir} --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webUrl,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: { VITE_API_URL: `${apiOrigin}/api` },
    },
  ],
})
