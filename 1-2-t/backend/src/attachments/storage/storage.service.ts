export interface StoredFile {
  storageKey: string;
  bytes: number;
}

export abstract class StorageService {
  abstract put(params: {
    buffer: Buffer;
    originalFilename: string;
  }): Promise<StoredFile>;
  abstract getStream(
    storageKey: string,
  ): Promise<{ stream: NodeJS.ReadableStream } | null>;
}
