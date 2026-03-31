import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'

import { AppModule } from '../../src/app.module'
import { PRISMA_DATABASE_URL } from '../../src/common/db/prisma.service'
import { HttpExceptionFilter } from '../../src/common/http/http-exception.filter'

export async function createTestApp(options?: { databaseUrl?: string }): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PRISMA_DATABASE_URL)
    .useValue(options?.databaseUrl ?? process.env.DATABASE_URL)
    .compile()

  const app = moduleRef.createNestApplication()
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.init()
  return app
}
