import type { NextRequest } from 'next/server';

import { canAccessCourseContent, type ViewerContext } from '../../domain/accessControl';
import { HttpError } from '../errors/errors';
import { prisma } from '../db/prisma';
import { getCurrentUser } from '../session/getCurrentUser';

export async function authorizeFileRead(params: {
  req: NextRequest;
  fileId: string;
}): Promise<{ file: { id: string; path: string; mimeType: string; size: number; originalName: string } }> {
  const { req, fileId } = params;

  const file = await prisma.fileUpload.findUnique({
    where: { id: fileId },
    select: { id: true, path: true, mimeType: true, size: true, originalName: true, ownerCourseId: true },
  });

  if (!file) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到檔案' });
  }

  if (file.ownerCourseId == null) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到檔案' });
  }

  const course = await prisma.course.findUnique({
    where: { id: file.ownerCourseId },
    select: { id: true, instructorId: true },
  });

  if (!course) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到檔案' });
  }

  const user = await getCurrentUser(req);
  const viewer: ViewerContext = user
    ? { isAuthenticated: true, userId: user.id, role: user.role }
    : { isAuthenticated: false };

  const isPurchased =
    user != null
      ? (await prisma.purchase.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          select: { id: true },
        })) != null
      : false;

  const decision = canAccessCourseContent({
    courseInstructorId: course.instructorId,
    viewer,
    isPurchased,
  });

  if (decision !== 'ALLOW') {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '沒有權限存取內容' });
  }

  return { file };
}
