import { randomBytes } from 'node:crypto'
import pg from 'pg'

const serverVariable = 'HOSPITALSYSTEM_TEST_POSTGRES'

// Each run has a database of its own on the server the backend's PostgreSQL
// tests use. The API creates and migrates it as it starts, and the global
// teardown drops it. The name is chosen once, when the main process loads
// the config, and the API and the workers inherit it.
process.env.HOSPITALSYSTEM_E2E_DATABASE ??= `hs_e2e_${randomBytes(6).toString('hex')}`
export const databaseName = process.env.HOSPITALSYSTEM_E2E_DATABASE

function serverConnection() {
  const connection = process.env[serverVariable]?.trim()
  if (!connection) {
    throw new Error(
      `Set ${serverVariable} to a connection string for a PostgreSQL server where the end-to-end tests may ` +
        "create a database, as for the backend's PostgreSQL tests (see Testing in the README).",
    )
  }
  return connection
}

// The server's connection string with this run's database, for the API.
export function databaseConnection() {
  const settings = serverConnection()
    .split(';')
    .map((setting) => setting.trim())
    .filter((setting) => setting && !/^(database|db)\s*=/i.test(setting))
  return [...settings, `Database=${databaseName}`].join(';')
}

export async function dropDatabase() {
  const client = new pg.Client(clientConfig(serverConnection()))
  await client.connect()
  try {
    // The API is still connected; it stops after the teardown.
    await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  } finally {
    await client.end()
  }
}

// node-postgres settings from an Npgsql connection string: the server, the
// login and the database to connect to.
function clientConfig(connection: string): pg.ClientConfig {
  const settings = new Map(
    connection
      .split(';')
      .filter((setting) => setting.includes('='))
      .map((setting) => {
        const separator = setting.indexOf('=')
        return [setting.slice(0, separator).trim().toLowerCase(), setting.slice(separator + 1).trim()]
      }),
  )
  const first = (...keys: string[]) => keys.map((key) => settings.get(key)).find((value) => value !== undefined)
  return {
    host: first('host', 'server'),
    port: Number(first('port') ?? 5432),
    user: first('username', 'user id', 'userid', 'user name', 'user'),
    password: first('password', 'pwd'),
    database: first('database', 'db') ?? 'postgres',
  }
}
