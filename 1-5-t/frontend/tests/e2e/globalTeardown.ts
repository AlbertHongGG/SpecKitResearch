import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function globalTeardown() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const frontendDir = path.resolve(here, '../..');
  const repoRoot = path.resolve(frontendDir, '..');

  await rm(path.resolve(repoRoot, 'backend', 'prisma', 'e2e.db'), { force: true });
  await rm(path.resolve(repoRoot, 'backend', 'prisma', 'e2e.db-wal'), { force: true });
  await rm(path.resolve(repoRoot, 'backend', 'prisma', 'e2e.db-shm'), { force: true });
  await rm(path.resolve(repoRoot, 'storage', 'attachments'), { recursive: true, force: true });
}
