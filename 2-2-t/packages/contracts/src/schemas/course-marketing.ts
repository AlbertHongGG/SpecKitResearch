import { z } from 'zod';
import { CourseSummarySchema } from './course';

export const CourseMarketingListSchema = z.object({
  items: z.array(CourseSummarySchema),
});

export type CourseMarketingList = z.infer<typeof CourseMarketingListSchema>;

export const ViewerFlagsSchema = z.object({
  isAuthenticated: z.boolean(),
  isPurchased: z.boolean(),
  isOwner: z.boolean(),
  isAdmin: z.boolean(),
});

export const OutlineLessonSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  lessonOrder: z.number().int(),
});

export const OutlineSectionSchema = z.object({
  sectionTitle: z.string(),
  sectionOrder: z.number().int(),
  lessons: z.array(OutlineLessonSchema),
});

export const CourseMarketingDetailSchema = z.object({
  course: CourseSummarySchema,
  outline: z.array(OutlineSectionSchema),
  viewer: ViewerFlagsSchema,
});

export type CourseMarketingDetail = z.infer<typeof CourseMarketingDetailSchema>;
