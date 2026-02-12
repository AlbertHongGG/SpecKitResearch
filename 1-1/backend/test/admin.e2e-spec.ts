import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import bcrypt from 'bcrypt'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import type { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { HttpExceptionFilter } from './../src/common/http/http-exception.filter'
import { PrismaService } from './../src/common/prisma/prisma.service'

jest.setTimeout(30_000)

describe('Admin (e2e)', () => {
  const backendDir = path.resolve(__dirname, '..')
  const dbFile = path.resolve(backendDir, 'test-admin.e2e.db')
  const databaseUrl = `file:${dbFile}`

  let app: INestApplication<App>
  let prisma: PrismaService

  let adminToken: string
  let memberToken: string
  let createdActivityId: string

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl
    process.env.JWT_ACCESS_SECRET = 'test-secret'

    const schemaPath = path.resolve(backendDir, 'prisma/schema.prisma')

    fs.rmSync(dbFile, { force: true })
    execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
    })

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    )
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    prisma = app.get(PrismaService)
    await prisma.$connect()

    const password = 'Password123!'
    const hash = await bcrypt.hash(password, 10)

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin-e2e@test.local',
        passwordHash: hash,
        role: 'admin',
      },
    })

    await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member-e2e@test.local',
        passwordHash: hash,
        role: 'member',
      },
    })

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, password })
      .expect(201)

    adminToken = adminLogin.body.access_token

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member-e2e@test.local', password })
      .expect(201)

    memberToken = memberLogin.body.access_token
  })

  afterAll(async () => {
    await prisma?.$disconnect()
    await app?.close()
    fs.rmSync(dbFile, { force: true })
  })

  it('member calling /admin/* returns 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/activities')
      .set('authorization', `Bearer ${memberToken}`)
      .expect(403)

    expect(res.body).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('admin can create an activity; public list can see it', async () => {
    const create = await request(app.getHttpServer())
      .post('/admin/activities')
      .set('authorization', `Bearer ${adminToken}`)
      .send({
        title: 'E2E Published',
        description: 'D',
        date: '2026-02-10T10:00:00.000Z',
        location: 'L',
        deadline: '2026-02-09T10:00:00.000Z',
        capacity: 2,
        status: 'published',
      })
      .expect(201)

    expect(create.body).toMatchObject({ activity: { title: 'E2E Published' } })
    createdActivityId = create.body.activity.id

    const list = await request(app.getHttpServer()).get('/activities').expect(200)
    const titles = (list.body.items ?? []).map((i: any) => i.title)
    expect(titles).toContain('E2E Published')
  })

  it('admin export CSV returns text/csv with header', async () => {
    const member = await prisma.user.findUnique({ where: { email: 'member-e2e@test.local' } })
    if (!member) throw new Error('missing member')

    await prisma.registration.create({
      data: {
        userId: member.id,
        activityId: createdActivityId,
      },
    })

    const res = await request(app.getHttpServer())
      .get(`/admin/activities/${createdActivityId}/registrations/export`)
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('name,email,registered_at')
    expect(res.text).toContain('member-e2e@test.local')
  })
})
