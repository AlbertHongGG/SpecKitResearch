import { Module } from '@nestjs/common'

import { PrismaService, PRISMA_DATABASE_URL } from './prisma.service'

@Module({
  providers: [
    {
      provide: PRISMA_DATABASE_URL,
      useFactory: () => {
        // Lazy import avoids eager env validation in test override scenarios.
        const { env } = require('../config/env') as typeof import('../config/env')
        return env.DATABASE_URL
      },
    },
    PrismaService,
  ],
  exports: [PrismaService, PRISMA_DATABASE_URL],
})
export class PrismaModule {}
