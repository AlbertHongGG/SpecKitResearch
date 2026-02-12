import { NextResponse, type NextRequest } from 'next/server';
import path from 'node:path';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../src/server/guards/auth';
import { HttpError } from '../../../../src/server/errors/errors';
import { validateUpload } from '../../../../src/server/files/validateUpload';
import { compensateSavedUpload } from '../../../../src/server/files/compensation';
import { saveUpload } from '../../../../src/server/files/storage';

export const POST = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['instructor', 'admin']);

  const form = await req.formData().catch(() => null);
  if (!form) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '請使用 multipart/form-data' });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: 'file required' });
  }

  const ownerCourseId = (form.get('ownerCourseId') as string | null) ?? null;
  const ownerLessonId = (form.get('ownerLessonId') as string | null) ?? null;
  const isPublicRaw = (form.get('isPublic') as string | null) ?? null;
  const isPublic = isPublicRaw ? isPublicRaw === 'true' || isPublicRaw === '1' : false;

  const bytes = new Uint8Array(await file.arrayBuffer());
  validateUpload({ mimeType: file.type, size: bytes.byteLength });

  const ext = path.extname(file.name || '') || (file.type === 'application/pdf' ? '.pdf' : '');
  const stored = await saveUpload({ bytes, extension: ext || 'bin' });

  try {
    const row = await prisma.fileUpload.create({
      data: {
        path: stored.relativePath,
        mimeType: file.type,
        size: bytes.byteLength,
        originalName: file.name || 'upload',
        isPublic,
        ownerCourseId,
        ownerLessonId,
      },
      select: {
        id: true,
        mimeType: true,
        size: true,
        originalName: true,
        isPublic: true,
      },
    });

    return NextResponse.json({
      file: {
        id: row.id,
        mimeType: row.mimeType,
        size: row.size,
        originalName: row.originalName,
        isPublic: row.isPublic,
        url: `/api/files/${row.id}`,
      },
    });
  } catch (err) {
    await compensateSavedUpload({ relativePath: stored.relativePath });
    throw err;
  }
});
