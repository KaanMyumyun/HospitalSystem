import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { databaseConnection } from './database.ts'
import { admin } from './settings.ts'

export default async function globalSetup() {
  const command = spawn('dotnet', ['run', '--no-build', '--no-launch-profile', '--', '--create-admin', admin.name], {
    cwd: resolve(import.meta.dirname, '../../HospitalSystem'),
    env: {
      ...process.env,
      DOTNET_ENVIRONMENT: 'Production',
      ASPNETCORE_ENVIRONMENT: 'Production',
      ConnectionStrings__DefaultConnection: databaseConnection(),
    },
  })
  let output = ''
  command.stdout.on('data', (chunk: Buffer) => (output += chunk))
  command.stderr.on('data', (chunk: Buffer) => (output += chunk))
  command.stdin.end(`${admin.password}\n`)

  const exitCode = await new Promise<number | null>((done, fail) => {
    command.on('error', fail)
    command.on('close', done)
  })
  if (exitCode !== 0) throw new Error(`--create-admin exited with ${exitCode}:\n${output}`)
}
