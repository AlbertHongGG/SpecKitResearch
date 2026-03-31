import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function globalSetup() {
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(configDir, '../../..');
  const backendDir = path.join(repoRoot, 'backend');

  // Seed is required for deterministic E2E (users/service/timeslot).
  execSync('npm run prisma:seed', { cwd: backendDir, stdio: 'inherit' });
}
