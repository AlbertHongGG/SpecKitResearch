import { z } from 'zod';
import { RuleGroupSchema } from './rules';

export const SurveyStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);
export type SurveyStatus = z.infer<typeof SurveyStatusSchema>;

export const QuestionTypeSchema = z.enum([
  'SC',
  'MC',
  'TEXT',
  'NUMBER',
  'RATING',
  'MATRIX'
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const OptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string()
});
export type Option = z.infer<typeof OptionSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: QuestionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(OptionSchema).optional()
});
export type Question = z.infer<typeof QuestionSchema>;

export const SurveySummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  status: SurveyStatusSchema,
  is_anonymous: z.boolean(),
  created_at: z.string().datetime(),
  publish_hash: z.string().nullable()
});
export type SurveySummary = z.infer<typeof SurveySummarySchema>;

export const SurveyDetailSchema = SurveySummarySchema.extend({
  owner_user_id: z.string(),
  description: z.string().nullable(),
  questions: z.array(QuestionSchema),
  rule_groups: z.array(RuleGroupSchema)
});
export type SurveyDetail = z.infer<typeof SurveyDetailSchema>;

export const CreateSurveyRequestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  is_anonymous: z.boolean(),
  description: z.string().nullable().optional()
});
export type CreateSurveyRequest = z.infer<typeof CreateSurveyRequestSchema>;

export const UpdateSurveyRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_anonymous: z.boolean().optional(),
  questions: z.array(QuestionSchema).optional(),
  rule_groups: z.array(RuleGroupSchema).optional()
});
export type UpdateSurveyRequest = z.infer<typeof UpdateSurveyRequestSchema>;

export const PublicSurveySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  is_anonymous: z.boolean(),
  questions: z.array(QuestionSchema),
  rule_groups: z.array(RuleGroupSchema)
});
export type PublicSurvey = z.infer<typeof PublicSurveySchema>;

export const GetPublicSurveyResponseSchema = z.object({
  survey: PublicSurveySchema,
  publish_hash: z.string()
});
export type GetPublicSurveyResponse = z.infer<typeof GetPublicSurveyResponseSchema>;
