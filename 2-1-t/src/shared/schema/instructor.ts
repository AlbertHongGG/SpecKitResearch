import { z } from 'zod';

import { idSchema } from './api';

export const createCourseDraftRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().min(0),
  categoryId: idSchema,
  tagIds: z.array(idSchema).default([]),
  coverImageUrl: z.string().url().nullable().optional(),
});

export const updateCourseRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: z.number().int().min(0).optional(),
    categoryId: idSchema.optional(),
    tagIds: z.array(idSchema).optional(),
    coverImageUrl: z.string().url().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const submitCourseRequestSchema = z.object({});

export const lifecycleCourseRequestSchema = z.object({
  action: z.enum(['ARCHIVE', 'UNARCHIVE']),
});

export const createSectionRequestSchema = z.object({
  title: z.string().min(1),
});

export const updateSectionRequestSchema = z.object({
  title: z.string().min(1),
});

export const reorderRequestSchema = z.object({
  order: z.number().int().min(1),
});

export const createLessonRequestSchema = z.object({
  title: z.string().min(1),
  contentType: z.enum(['text', 'image', 'pdf']).default('text'),
  contentText: z.string().optional(),
  contentFileId: idSchema.optional(),
  contentFileName: z.string().optional(),
});

export const updateLessonRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    contentType: z.enum(['text', 'image', 'pdf']).optional(),
    contentText: z.string().nullable().optional(),
    contentFileId: idSchema.nullable().optional(),
    contentFileName: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
