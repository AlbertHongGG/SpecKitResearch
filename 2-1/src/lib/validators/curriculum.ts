import { z } from 'zod';

export const createSectionBodySchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(1),
});

export const updateSectionBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    order: z.number().int().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });

export const reorderSectionsBodySchema = z.object({
  sections: z.array(
    z.object({
      sectionId: z.string().min(1),
      order: z.number().int().min(1),
    }),
  ),
});

export const createLessonBodySchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(1),
  contentType: z.enum(['text', 'image', 'pdf']),
  contentText: z.string().min(1).max(20000).nullable().optional(),
  contentImageFileId: z.string().min(1).nullable().optional(),
  contentPdfFileId: z.string().min(1).nullable().optional(),
});

export const updateLessonBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    order: z.number().int().min(1).optional(),
    contentType: z.enum(['text', 'image', 'pdf']).optional(),
    contentText: z.string().min(1).max(20000).nullable().optional(),
    contentImageFileId: z.string().min(1).nullable().optional(),
    contentPdfFileId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '至少提供一個欄位' });

export const reorderLessonsBodySchema = z.object({
  lessons: z.array(
    z.object({
      lessonId: z.string().min(1),
      order: z.number().int().min(1),
    }),
  ),
});
