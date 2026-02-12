import { z } from 'zod';

export const SurveyStatusSchema = z.enum(['Draft', 'Published', 'Closed']);

export const SurveySchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  is_anonymous: z.boolean(),
  status: SurveyStatusSchema,
  publish_hash: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});

export const QuestionTypeSchema = z.enum([
  'SingleChoice',
  'MultipleChoice',
  'Text',
  'Number',
  'Rating',
  'Matrix',
]);

export const QuestionSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  type: QuestionTypeSchema,
  title: z.string(),
  is_required: z.boolean(),
  order: z.number().int(),
});

export const OptionSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  label: z.string(),
  value: z.string(),
});

export const RuleActionSchema = z.enum(['show', 'hide']);
export const GroupOperatorSchema = z.enum(['AND', 'OR']);
export const RuleOperatorSchema = z.enum(['equals', 'not_equals', 'contains']);

export const LogicRuleSchema = z.object({
  id: z.string().uuid(),
  rule_group_id: z.string().uuid().optional(),
  source_question_id: z.string().uuid(),
  operator: RuleOperatorSchema,
  value: z.string(),
});

export const RuleGroupSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid().optional(),
  target_question_id: z.string().uuid(),
  action: RuleActionSchema,
  group_operator: GroupOperatorSchema,
  rules: z.array(LogicRuleSchema),
});

export const SurveyListResponseSchema = z.object({
  surveys: z.array(SurveySchema),
});

export const CreateSurveyRequestSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  is_anonymous: z.boolean(),
});

export const CreateSurveyResponseSchema = z.object({
  survey_id: z.string().uuid(),
});

export const SurveyDetailResponseSchema = z.object({
  survey: SurveySchema,
  questions: z.array(QuestionSchema),
  options: z.array(OptionSchema),
  rule_groups: z.array(RuleGroupSchema),
});

export const PublicSurveyResponseSchema = z.object({
  survey: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    is_anonymous: z.boolean(),
    status: SurveyStatusSchema,
  }),
  publish_hash: z.string(),
  questions: z.array(QuestionSchema),
  options: z.array(OptionSchema),
  rule_groups: z.array(RuleGroupSchema),
});

export const PublishSurveyResponseSchema = z.object({
  status: SurveyStatusSchema,
  publish_hash: z.string(),
});

export const CloseSurveyResponseSchema = z.object({
  status: SurveyStatusSchema,
});

export const AnswerInputSchema = z.object({
  question_id: z.string().uuid(),
  value: z.any(),
});

export const SubmitResponseRequestSchema = z.object({
  survey_id: z.string().uuid(),
  publish_hash: z.string(),
  answers: z.array(AnswerInputSchema),
});

export const SubmitResponseResponseSchema = z.object({
  response_id: z.string().uuid(),
  response_hash: z.string(),
  submitted_at: z.string().datetime(),
});

export const PreviewSurveyRequestSchema = z.object({
  answers: z.array(AnswerInputSchema),
});

export const PreviewSurveyResponseSchema = z.object({
  visible_question_ids: z.array(z.string().uuid()),
  hidden_question_ids: z.array(z.string().uuid()),
});

export const ResultsAggregateSchema = z.object({
  question_id: z.string().uuid(),
  type: QuestionTypeSchema,
  data: z.any(),
});

export const ResultsResponseSchema = z.object({
  survey: SurveySchema,
  publish_hash: z.string(),
  totals: z.object({
    response_count: z.number().int(),
  }),
  aggregates: z.array(ResultsAggregateSchema),
});

export const ExportResponseSchema = z.object({
  publish_hash: z.string(),
  next_cursor: z.string().nullable().optional(),
  responses: z.array(
    z.object({
      response_id: z.string().uuid(),
      response_hash: z.string(),
      submitted_at: z.string().datetime(),
      respondent_id: z.string().uuid().nullable().optional(),
      answers: z.array(AnswerInputSchema),
    }),
  ),
});

export type Survey = z.infer<typeof SurveySchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type RuleGroup = z.infer<typeof RuleGroupSchema>;
