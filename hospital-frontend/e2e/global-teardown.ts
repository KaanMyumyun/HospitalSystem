import { dropDatabase } from './database.ts'

// Its own file rather than a function the global setup returns, so the
// database goes even when the setup fails.
export default async function globalTeardown() {
  await dropDatabase()
}
