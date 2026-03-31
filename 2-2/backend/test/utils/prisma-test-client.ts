import path from 'node:path'

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

function sqliteFilePathFromDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) return 'dev.db'
  const raw = databaseUrl.slice('file:'.length)
  const normalized = raw.startsWith('//') ? raw.slice(2) : raw

  const withoutLeadingSlash = normalized.match(/^\/[A-Za-z]:\//) ? normalized.slice(1) : normalized
  const withoutLeadingDotSlash = withoutLeadingSlash.startsWith('./')
    ? withoutLeadingSlash.slice(2)
    : withoutLeadingSlash

  return withoutLeadingDotSlash.length > 0 ? withoutLeadingDotSlash : 'dev.db'
}

export function createPrismaTestClient(databaseUrl: string) {
  const sqliteFilePath = sqliteFilePathFromDatabaseUrl(databaseUrl)
  const sqliteDbAbsolutePath = path.resolve(process.cwd(), sqliteFilePath)
  const adapter = new PrismaBetterSqlite3({ url: sqliteDbAbsolutePath })

  return new PrismaClient({ adapter })
}
