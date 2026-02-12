import fs from 'node:fs';
import path from 'node:path';

export class LocalStorage {
  constructor(private readonly uploadsDir: string) {}

  ensureUploadsDir() {
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  resolveStorageKey(storageKey: string): string {
    // Disallow path traversal
    const safe = storageKey.replace(/\\/g, '/');
    if (safe.includes('..')) {
      throw new Error('Invalid storageKey');
    }
    return path.join(this.uploadsDir, safe);
  }

  exists(storageKey: string): boolean {
    const full = this.resolveStorageKey(storageKey);
    return fs.existsSync(full);
  }

  createReadStream(storageKey: string) {
    const full = this.resolveStorageKey(storageKey);
    return fs.createReadStream(full);
  }
}
