import path from 'node:path'
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

export const PRISMA_DATABASE_URL = 'PRISMA_DATABASE_URL'

function sqliteFilePathFromDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) return 'dev.db'
  const raw = databaseUrl.slice('file:'.length)
  const normalized = raw.startsWith('//') ? raw.slice(2) : raw

  // Windows absolute file URLs can look like /C:/path/to/db
  const withoutLeadingSlash = normalized.match(/^\/[A-Za-z]:\//) ? normalized.slice(1) : normalized
  const withoutLeadingDotSlash = withoutLeadingSlash.startsWith('./')
    ? withoutLeadingSlash.slice(2)
    : withoutLeadingSlash

  return withoutLeadingDotSlash.length > 0 ? withoutLeadingDotSlash : 'dev.db'
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(PRISMA_DATABASE_URL) databaseUrl: string) {
    const sqliteFilePath = sqliteFilePathFromDatabaseUrl(databaseUrl)
    const sqliteDbAbsolutePath = path.resolve(process.cwd(), sqliteFilePath)
    const adapter = new PrismaBetterSqlite3({ url: sqliteDbAbsolutePath })

    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
