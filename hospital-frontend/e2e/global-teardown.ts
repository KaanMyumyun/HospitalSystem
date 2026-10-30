import { dropDatabase } from './database.ts'

export default async function globalTeardown() {
  await dropDatabase()
}
