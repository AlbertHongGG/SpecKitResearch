import { promises as fs } from 'node:fs';
import path from 'node:path';

import { prisma } from '../db/prisma';
import { deleteUpload, ensureUploadRoot } from './storage';

export async function compensateSavedUpload(params: { relativePath: string }) {
  await deleteUpload(params.relativePath);
}

export async function cleanupOrphanUploads(params?: {
  dryRun?: boolean;
  olderThanMs?: number;
}): Promise<{ scanned: number; deleted: number; kept: number }> {
  const dryRun = params?.dryRun ?? false;
  const olderThanMs = params?.olderThanMs ?? 60 * 60 * 1000;

  await ensureUploadRoot();
  const uploadRoot = path.join(process.cwd(), 'storage', 'uploads');

  const [files, rows] = await Promise.all([
    fs.readdir(uploadRoot).catch(() => [] as string[]),
    prisma.fileUpload.findMany({ select: { path: true } }),
  ]);

  const referenced = new Set(rows.map((r) => r.path));
  const now = Date.now();

  let scanned = 0;
  let deleted = 0;
  let kept = 0;

  for (const filename of files) {
    if (filename === '.gitkeep') continue;
    scanned += 1;

    if (referenced.has(filename)) {
      kept += 1;
      continue;
    }

    const abs = path.join(uploadRoot, filename);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) continue;
    if (now - stat.mtimeMs < olderThanMs) {
      kept += 1;
      continue;
    }

    if (!dryRun) {
      await deleteUpload(filename);
    }
    deleted += 1;
  }

  return { scanned, deleted, kept };
}
