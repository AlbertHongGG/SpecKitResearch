import { afterAll, beforeAll } from 'vitest';

import { prisma } from '../../src/infra/db/prisma';

function randomSchemaName() {
  const suffix = Math.random().toString(16).slice(2);
  return `test_${Date.now()}_${suffix}`;
}

export function withTestDbSchema() {
  const schema = randomSchemaName();

  beforeAll(async () => {
    // Requires DATABASE_URL with a role allowed to CREATE SCHEMA.
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  });

  return { schema };
}
