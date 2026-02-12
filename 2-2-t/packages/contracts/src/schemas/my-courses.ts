import { z } from 'zod';
import { CourseSummarySchema } from './course';

export const ProgressSummarySchema = z.object({
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
});

export const MyCourseItemSchema = z.object({
  course: CourseSummarySchema,
  purchasedAt: z.string().datetime(),
  progress: ProgressSummarySchema,
});

export const MyCoursesListSchema = z.object({
  items: z.array(MyCourseItemSchema),
});

export const CurriculumLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number().int(),
});

export const CurriculumSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number().int(),
  lessons: z.array(CurriculumLessonSchema),
});

export const LessonAttachmentMetaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

export const ReaderLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(['text', 'image', 'pdf']),
  contentText: z.string().nullable().optional(),
  contentImageUrl: z.string().nullable().optional(),
  attachments: z.array(LessonAttachmentMetaSchema),
});

export const MyCourseReaderSchema = z.object({
  course: CourseSummarySchema,
  curriculum: z.array(CurriculumSectionSchema),
  lesson: ReaderLessonSchema,
  progressSummary: ProgressSummarySchema,
});

export type MyCoursesList = z.infer<typeof MyCoursesListSchema>;
export type MyCourseReader = z.infer<typeof MyCourseReaderSchema>;
