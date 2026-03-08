import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { applySqlitePragmas } from './sqlite.pragma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    await applySqlitePragmas(this);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
