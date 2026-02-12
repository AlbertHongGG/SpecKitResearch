import { execSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient, UserRole, type LeaveType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http/http-exception.filter';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { createHttpLogger } from '../src/common/logging/logger';

const BACKEND_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');

function getPrismaCliPath() {
    const binName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';

    const candidates = [
        path.join(BACKEND_ROOT, 'node_modules', '.bin', binName),
        path.join(WORKSPACE_ROOT, 'node_modules', '.bin', binName),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(`Prisma CLI not found. Tried: ${candidates.join(', ')}`);
}

export type Seeded = {
    prisma: PrismaClient;
    departmentEngineeringId: string;
    departmentHrId: string;
    manager: { id: string; email: string; password: string };
    employee: { id: string; email: string; password: string };
    hr: { id: string; email: string; password: string };
    leaveTypes: { annual: LeaveType; sick: LeaveType };
    year: number;
};

export function setTestEnv(overrides?: Partial<NodeJS.ProcessEnv>) {
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
    process.env.TZ = process.env.TZ ?? 'UTC';
    process.env.PORT = process.env.PORT ?? '3001';
    process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';
    process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'false';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
    process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(BACKEND_ROOT, 'test', '.tmp', 'uploads');

    if (overrides) {
        for (const [k, v] of Object.entries(overrides)) {
            if (v === undefined) continue;
            process.env[k] = v;
        }
    }
}

export async function createTestDatabaseUrl() {
    const dbDir = path.join(BACKEND_ROOT, 'test', '.tmp', 'db');
    await fs.mkdir(dbDir, { recursive: true });
    const filePath = path.join(dbDir, `${randomUUID()}.sqlite`);
    return { filePath, url: `file:${filePath}` };
}

export async function migrateTestDb(databaseUrl: string) {
    setTestEnv({ DATABASE_URL: databaseUrl });

    // Ensure clean slate
    const filePath = databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : databaseUrl;
    try {
        await fs.rm(filePath);
    } catch {
        // ignore
    }

    const prismaCli = getPrismaCliPath();

    execSync(`"${prismaCli}" migrate deploy --schema prisma/schema.prisma`, {
        cwd: BACKEND_ROOT,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
    });
}

export async function seedTestData(databaseUrl: string): Promise<Seeded> {
    setTestEnv({ DATABASE_URL: databaseUrl });

    const prisma = new PrismaClient();
    const year = new Date().getUTCFullYear();

    const engineering = await prisma.department.create({ data: { name: `Engineering-${randomUUID().slice(0, 8)}` } });
    const hrDept = await prisma.department.create({ data: { name: `HR-${randomUUID().slice(0, 8)}` } });

    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const manager = await prisma.user.create({
        data: {
            name: 'Manager One',
            email: `manager-${randomUUID().slice(0, 8)}@example.com`,
            passwordHash,
            role: UserRole.manager,
            departmentId: engineering.id,
        },
    });

    const employee = await prisma.user.create({
        data: {
            name: 'Employee One',
            email: `employee-${randomUUID().slice(0, 8)}@example.com`,
            passwordHash,
            role: UserRole.employee,
            departmentId: engineering.id,
            managerId: manager.id,
        },
    });

    const hr = await prisma.user.create({
        data: {
            name: 'HR Staff',
            email: `hr-${randomUUID().slice(0, 8)}@example.com`,
            passwordHash,
            role: UserRole.employee,
            departmentId: hrDept.id,
        },
    });

    const annual = await prisma.leaveType.create({
        data: { name: `年假-${randomUUID().slice(0, 6)}`, annualQuota: 10, carryOver: false, requireAttachment: false, isActive: true },
    });
    const sick = await prisma.leaveType.create({
        data: { name: `病假-${randomUUID().slice(0, 6)}`, annualQuota: 30, carryOver: false, requireAttachment: true, isActive: true },
    });

    for (const user of [manager, employee, hr]) {
        for (const lt of [annual, sick]) {
            await prisma.leaveBalance.create({
                data: {
                    userId: user.id,
                    leaveTypeId: lt.id,
                    year,
                    quota: lt.annualQuota,
                    usedDays: 0,
                    reservedDays: 0,
                },
            });
        }
    }

    return {
        prisma,
        departmentEngineeringId: engineering.id,
        departmentHrId: hrDept.id,
        manager: { id: manager.id, email: manager.email, password },
        employee: { id: employee.id, email: employee.email, password },
        hr: { id: hr.id, email: hr.email, password },
        leaveTypes: { annual, sick },
        year,
    };
}

export async function createTestApp(): Promise<INestApplication> {
    const mod = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = mod.createNestApplication();

    app.use(cookieParser());
    app.use(requestIdMiddleware);
    app.use(createHttpLogger());

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    return app;
}

export async function closeSeeded(seed: Seeded | undefined | null) {
    if (!seed) return;
    await seed.prisma.$disconnect();
}

export async function issueCsrf(agent: request.SuperAgentTest) {
    const res = await agent.get('/auth/csrf').expect(200);
    expect(typeof res.body?.token).toBe('string');
    return res.body.token as string;
}

export async function login(agent: request.SuperAgentTest, args: { email: string; password: string }) {
    const token = await issueCsrf(agent);

    await agent
        .post('/auth/login')
        .set('X-CSRF-Token', token)
        .set('Origin', process.env.APP_ORIGIN ?? 'http://localhost:5173')
        .send(args)
        .expect(200);

    return token;
}

export async function authAgent(app: INestApplication) {
    return request.agent(app.getHttpServer());
}
