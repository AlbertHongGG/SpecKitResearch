import { z } from 'zod';

export const RuleActionSchema = z.enum(['show', 'hide']);
export type RuleAction = z.infer<typeof RuleActionSchema>;

export const RuleOperatorSchema = z.enum(['equals', 'not_equals', 'contains']);
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;

export const LogicRuleSchema = z.object({
  id: z.string(),
  source_question_id: z.string(),
  operator: RuleOperatorSchema,
  value: z.any()
});
export type LogicRule = z.infer<typeof LogicRuleSchema>;

export const RuleGroupSchema = z.object({
  id: z.string(),
  target_question_id: z.string(),
  action: RuleActionSchema,
  mode: z.enum(['AND', 'OR']),
  rules: z.array(LogicRuleSchema)
});
export type RuleGroup = z.infer<typeof RuleGroupSchema>;
