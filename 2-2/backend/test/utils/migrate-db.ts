import path from 'node:path'
import { spawnSync } from 'node:child_process'

export function migrateDatabase(databaseUrl: string) {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    shell: true,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const stdout = (result.stdout ?? '').toString().trim()
    const stderr = (result.stderr ?? '').toString().trim()
    throw new Error(
      `prisma migrate deploy failed (exit ${result.status ?? 'unknown'})\n${stdout}${
        stdout && stderr ? '\n' : ''
      }${stderr}`,
    )
  }
}
