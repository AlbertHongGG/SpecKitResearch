import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';

export class LocalFilesystemStorage {
    constructor(private readonly baseDir: string) { }

    async ensure() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }

    async save(storageKey: string, buffer: Buffer) {
        await this.ensure();
        const fullPath = path.join(this.baseDir, storageKey);
        await fs.writeFile(fullPath, buffer);
        return { storageKey, fullPath };
    }

    async exists(storageKey: string) {
        const fullPath = path.join(this.baseDir, storageKey);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    open(storageKey: string) {
        const fullPath = path.join(this.baseDir, storageKey);
        return createReadStream(fullPath);
    }

    async delete(storageKey: string) {
        const fullPath = path.join(this.baseDir, storageKey);
        try {
            await fs.rm(fullPath, { force: true });
        } catch {
            // ignore
        }
    }

    resolve(storageKey: string) {
        return path.join(this.baseDir, storageKey);
    }
}
