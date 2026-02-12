import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageService, StoredFile } from './storage.service';

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly baseDir: string;

  constructor() {
    super();
    this.baseDir = path.join(process.cwd(), 'uploads');
  }

  async put(params: {
    buffer: Buffer;
    originalFilename: string;
  }): Promise<StoredFile> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const storageKey = `att_${randomUUID()}`;
    const filePath = path.join(this.baseDir, storageKey);
    await fs.writeFile(filePath, params.buffer);
    return { storageKey, bytes: params.buffer.byteLength };
  }

  async getStream(
    storageKey: string,
  ): Promise<{ stream: NodeJS.ReadableStream } | null> {
    const filePath = path.join(this.baseDir, storageKey);
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    return { stream: createReadStream(filePath) };
  }
}
