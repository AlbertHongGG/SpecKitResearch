import type { PublicSurvey, RuleGroup, RuleOperator } from '@app/contracts';

export type AnswerValue = unknown;
export type AnswerMap = Record<string, AnswerValue>;

export type SurveyLike = Pick<PublicSurvey, 'questions' | 'rule_groups'>;

export type VisibilityResult = {
  visibleQuestionIds: Set<string>;
  becameHiddenQuestionIds: string[];
};

export type DraftValidationError = {
  code: 'FORWARD_ONLY_VIOLATION' | 'CYCLE_DETECTED';
  message: string;
  source_question_id?: string;
  target_question_id?: string;
  rule_group_id?: string;
};

export type DraftValidationResult = {
  ok: boolean;
  errors: DraftValidationError[];
};

export type SubmissionValidationError = {
  code: 'ANSWER_FOR_HIDDEN_QUESTION' | 'REQUIRED_QUESTION_MISSING';
  message: string;
  question_id: string;
};

export type SubmissionValidationResult = {
  ok: boolean;
  errors: SubmissionValidationError[];
  visibleQuestionIds: Set<string>;
};

export type OperatorEvaluator = (operator: RuleOperator, actual: AnswerValue, expected: AnswerValue) => boolean;
