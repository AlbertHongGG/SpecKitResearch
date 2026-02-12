import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { installImmutabilityMiddleware } from './immutability.middleware';
import { installSchemaLockMiddleware } from '../../surveys/schema-lock.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    installImmutabilityMiddleware(this);
    installSchemaLockMiddleware(this);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
