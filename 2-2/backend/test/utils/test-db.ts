import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'

export type TestDb = {
  databaseUrl: string
  cleanup(): Promise<void>
}

export async function createTestDb(): Promise<TestDb> {
  const filename = `smartbooking-test-${randomUUID()}.db`
  const filePath = path.join(os.tmpdir(), filename)

  // Prisma SQLite URLs are `file:...`
  const normalizedPath = filePath.replace(/\\/g, '/')
  const databaseUrl = `file:${normalizedPath}`

  return {
    databaseUrl,
    async cleanup() {
      await rm(filePath, { force: true })
    },
  }
}
