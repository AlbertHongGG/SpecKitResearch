import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/errors/http-exception.filter'
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor'

export async function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helpdesk-test-'))
  const dbPath = path.join(dir, 'test.db')
  const url = `file:${dbPath}`

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  })

  const prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
  })

  await prisma.$connect()

  return {
    prisma,
    url,
    async cleanup() {
      await prisma.$disconnect()
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}

export async function createTestApp(params: { databaseUrl: string }) {
  process.env.DATABASE_URL = params.databaseUrl
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret-1234567890'
  process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m'

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app: INestApplication = moduleRef.createNestApplication()
  app.useGlobalInterceptors(new RequestIdInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.init()

  return {
    app,
    async close() {
      await app.close()
    },
  }
}
