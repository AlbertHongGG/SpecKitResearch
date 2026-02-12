import { createReadStream, promises as fs } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UPLOAD_ROOT = path.join(process.cwd(), 'storage', 'uploads');

export type StoredFile = {
  relativePath: string;
  absolutePath: string;
};

export async function ensureUploadRoot(): Promise<void> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
}

function assertSafeFilename(filename: string) {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename');
  }
}

export async function saveUpload(params: {
  bytes: Uint8Array;
  extension: string;
}): Promise<StoredFile> {
  await ensureUploadRoot();

  const ext = params.extension.startsWith('.') ? params.extension : `.${params.extension}`;
  assertSafeFilename(ext);

  const filename = `${randomUUID()}${ext}`;
  const relativePath = filename;
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);

  await fs.writeFile(absolutePath, params.bytes);

  return { relativePath, absolutePath };
}

export async function openUploadStream(relativePath: string) {
  assertSafeFilename(relativePath);
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await stat(absolutePath);
  return createReadStream(absolutePath);
}

export async function deleteUpload(relativePath: string) {
  assertSafeFilename(relativePath);
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await fs.unlink(absolutePath).catch(() => undefined);
}
