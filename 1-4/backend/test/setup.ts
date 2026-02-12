import 'reflect-metadata';

process.env.DATABASE_URL ??= 'file:./prisma/test.db';
process.env.JWT_SECRET ??= 'test-secret-123456';
process.env.JWT_ACCESS_TTL_SECONDS ??= '900';
process.env.REFRESH_TOKEN_TTL_DAYS ??= '30';

jest.setTimeout(30_000);
