import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

import { resolveUploadPath, uploadRoot } from '@/lib/storage/paths';

export async function ensureUploadDir() {
  await mkdir(uploadRoot(), { recursive: true });
}

export async function saveFile(buffer: Buffer, storagePath: string) {
  await ensureUploadDir();
  const abs = resolveUploadPath(storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
}

export function createReadStream(storagePath: string) {
  const abs = resolveUploadPath(storagePath);
  return fs.createReadStream(abs);
}

export async function statFile(storagePath: string) {
  const abs = resolveUploadPath(storagePath);
  return fs.promises.stat(abs);
}
