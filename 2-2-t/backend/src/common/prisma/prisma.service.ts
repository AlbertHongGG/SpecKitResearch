import 'dotenv/config';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client';

function getSqliteFilePathFromDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (e.g. file:./dev.db)');
  }

  let filePath = databaseUrl;
  if (filePath.startsWith('file:')) {
    filePath = filePath.slice('file:'.length);
  }

  const queryIndex = filePath.indexOf('?');
  if (queryIndex >= 0) {
    filePath = filePath.slice(0, queryIndex);
  }

  if (!filePath) {
    throw new Error('DATABASE_URL must point to a SQLite file path (e.g. file:./dev.db)');
  }

  return filePath;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const filePath = getSqliteFilePathFromDatabaseUrl(process.env.DATABASE_URL);
    const adapter = new PrismaBetterSqlite3({ url: filePath });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
