import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { writeAttachmentCreateNew } from '../src/storage/attachments.js';
import { ApiError } from '../src/observability/errors.js';

describe('US1 attachments are create-new (no overwrite)', () => {
  it('fails with 409 Conflict if the same storageKey is written twice', async () => {
    const storageKey = `test-attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const first = await writeAttachmentCreateNew({
      storageKey,
      stream: Readable.from(Buffer.from('hello')),
    });
    expect(first.sizeBytes).toBe(5);

    let err: unknown;
    try {
      await writeAttachmentCreateNew({
        storageKey,
        stream: Readable.from(Buffer.from('world')),
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.statusCode).toBe(409);
    expect(apiErr.code).toBe('Conflict');

    // Clean up the file we created.
    await rm(path.join(path.resolve(process.cwd(), '../storage/attachments'), storageKey), { force: true });
  });
});
