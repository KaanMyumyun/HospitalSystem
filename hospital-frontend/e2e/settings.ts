// What the end-to-end run and its tests share. The run starts the API and the
// production build of the app on ports of their own, so it never talks to an
// API or dev server you are working with on 5272 and 5173.
export const apiPort = 5290
export const webPort = 5190
export const apiOrigin = `http://127.0.0.1:${apiPort}`
export const webUrl = `http://127.0.0.1:${webPort}`

// The API runs with this zone, and the tests work out dates in it.
export const clinicTimeZone = 'Europe/Sofia'

// Made by the global setup in each run's new database.
export const admin = { name: 'admin', password: 'e2e-admin-password' }
