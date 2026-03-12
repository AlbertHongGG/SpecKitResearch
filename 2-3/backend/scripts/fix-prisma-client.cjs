/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function ensureSymlink({ linkPath, targetPath }) {
  try {
    if (fs.existsSync(linkPath)) return;
    fs.symlinkSync(targetPath, linkPath, 'dir');
  } catch (err) {
    console.warn(`[fix-prisma-client] unable to create symlink ${linkPath} -> ${targetPath}: ${String(err)}`);
  }
}

function main() {
  let clientPkgJson;
  try {
    clientPkgJson = require.resolve('@prisma/client/package.json');
  } catch (err) {
    console.warn(`[fix-prisma-client] @prisma/client not resolvable: ${String(err)}`);
    return;
  }

  const clientDir = path.dirname(clientPkgJson);
  const expectedPrismaDir = path.join(clientDir, '.prisma');

  const candidates = [
    path.resolve(clientDir, '..', '..', '.prisma'),
    path.resolve(clientDir, '..', '..', '..', '.prisma'),
    path.resolve(process.cwd(), 'node_modules', '.prisma')
  ];

  const prismaDir = candidates.find((p) => fs.existsSync(p));
  if (!prismaDir) {
    console.warn(`[fix-prisma-client] .prisma directory not found. Tried: ${candidates.join(', ')}`);
    return;
  }

  ensureSymlink({ linkPath: expectedPrismaDir, targetPath: prismaDir });
}

main();
