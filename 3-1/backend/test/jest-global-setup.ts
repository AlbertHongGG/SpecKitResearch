import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default async function globalSetup() {
  const testDbUrl = 'file:./test.db?connection_limit=1&socket_timeout=30';
  const dbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
  });

  execSync('npx ts-node prisma/seed.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
  });
}
