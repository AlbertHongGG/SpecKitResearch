import { z } from 'zod';

export const AnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.record(z.any())
]);

export const AnswerInputSchema = z.object({
  question_id: z.string(),
  value: AnswerValueSchema
});
export type AnswerInput = z.infer<typeof AnswerInputSchema>;

export const SubmissionRequestSchema = z.object({
  respondent_id: z.string().nullable().optional(),
  answers: z.array(AnswerInputSchema)
});
export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;

export const SubmissionResponseSchema = z.object({
  response_id: z.string(),
  publish_hash: z.string(),
  response_hash: z.string()
});
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;
