import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function ensureSymlink({ linkPath, targetPath }) {
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const existingTarget = fs.readlinkSync(linkPath);
      if (existingTarget === targetPath) {
        return;
      }
    }

    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {
    // missing linkPath; create below
  }

  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(targetPath, linkPath, 'dir');
}

function main() {
  // When run via `pnpm --filter api db:generate`, cwd is apps/api
  const apiNodeModulesDir = path.resolve(process.cwd(), 'node_modules');
  const apiPrismaLink = path.join(apiNodeModulesDir, '.prisma');

  // Resolve @prisma/client from this workspace, then follow symlinks to pnpm virtual store.
  const prismaClientPkgJson = require.resolve('@prisma/client/package.json', {
    paths: [process.cwd()],
  });
  const prismaClientPkgJsonReal = fs.realpathSync(prismaClientPkgJson);

  const prismaClientDir = path.dirname(prismaClientPkgJsonReal);
  const virtualStoreNodeModulesDir = path.resolve(prismaClientDir, '..', '..');
  const virtualStorePrismaDir = path.join(virtualStoreNodeModulesDir, '.prisma');

  const virtualStoreClientDir = path.join(virtualStorePrismaDir, 'client');
  if (!fs.existsSync(virtualStoreClientDir)) {
    throw new Error(
      `Expected generated Prisma client at ${virtualStoreClientDir} (run prisma generate first)`,
    );
  }

  ensureSymlink({ linkPath: apiPrismaLink, targetPath: virtualStorePrismaDir });
}

try {
  main();
} catch (err) {
  // Don't fail installs/dev for editor-only conveniences.
  // eslint-disable-next-line no-console
  console.warn('[ensure-prisma-links] warning:', err);
}
