import path from 'path';

import { env } from '@/lib/env';
import { AppError } from '@/lib/errors/AppError';

export function uploadRoot(): string {
  return env().UPLOAD_DIR;
}

export function resolveUploadPath(storagePath: string): string {
  const root = uploadRoot();
  const resolved = path.resolve(root, storagePath);
  const normalizedRoot = path.resolve(root);

  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw AppError.forbidden('非法檔案路徑');
  }

  return resolved;
}
