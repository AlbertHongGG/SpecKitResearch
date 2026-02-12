import { prisma } from '@/db/prisma';

export type CreateFileAssetInput = {
  visibility: 'public' | 'protected';
  storagePath: string;
  mimeType: string;
  originalName?: string | null;
  sizeBytes?: number | null;
  courseId?: string | null;
};

export async function createFileAsset(input: CreateFileAssetInput) {
  return prisma.fileAsset.create({
    data: {
      visibility: input.visibility,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      originalName: input.originalName ?? null,
      sizeBytes: input.sizeBytes ?? null,
      courseId: input.courseId ?? null,
    },
  });
}

export async function getFileAssetById(id: string) {
  return prisma.fileAsset.findUnique({ where: { id } });
}
