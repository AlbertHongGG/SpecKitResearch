import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';

import { config } from './config.js';
import { conflict } from './httpError.js';

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error;
}

export async function saveAttachmentStream(options: {
  stream: Readable;
}): Promise<{ storageKey: string; absolutePath: string; sizeBytes: number }> {
  await mkdir(config.ATTACHMENTS_DIR, { recursive: true });

  const storageKey = randomUUID();
  const absolutePath = join(config.ATTACHMENTS_DIR, storageKey);

  let sizeBytes = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      sizeBytes += (chunk as Buffer).length;
      cb(null, chunk);
    },
  });

  try {
    await pipeline(options.stream, counter, createWriteStream(absolutePath, { flags: 'wx' }));
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'EEXIST') {
      throw conflict('Attachment storage key already exists');
    }
    throw err;
  }

  return { storageKey, absolutePath, sizeBytes };
}

