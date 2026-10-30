import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { databaseConnection } from './e2e/database.ts'
import { apiOrigin, clinicTimeZone, webPort, webUrl } from './e2e/settings.ts'

const buildDir = 'dist-e2e'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webUrl,
    locale: 'en-US',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
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
        JwtSettings__SecretKey: randomBytes(32).toString('base64'),
        Clinic__TimeZone: clinicTimeZone,
        Cors__AllowedOrigins__0: webUrl,
        ForwardedHeaders__TrustAllProxies: 'true',
        Metrics__Port: '0',
        Logging__Console__LogToStandardErrorThreshold: 'Warning',
      },
    },
    {
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
