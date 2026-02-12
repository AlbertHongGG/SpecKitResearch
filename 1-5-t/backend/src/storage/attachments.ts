import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { ApiError } from '../observability/errors.js';

const ATTACHMENTS_ROOT = path.resolve(process.cwd(), '../storage/attachments');

export async function writeAttachmentCreateNew(params: {
  storageKey: string;
  stream: Readable;
}): Promise<{ absolutePath: string; sizeBytes: number }> {
  await fs.mkdir(ATTACHMENTS_ROOT, { recursive: true });
  const absolutePath = path.join(ATTACHMENTS_ROOT, params.storageKey);

  // Create-new, no-overwrite.
  let sizeBytes = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      sizeBytes += Buffer.byteLength(chunk);
      cb(null, chunk);
    },
  });
  const writable = createWriteStream(absolutePath, { flags: 'wx' });
  await pipeline(params.stream, counter, writable).catch((e: any) => {
    if (e?.code === 'EEXIST') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Attachment already exists' });
    }
    throw e;
  });

  return { absolutePath, sizeBytes };
}
