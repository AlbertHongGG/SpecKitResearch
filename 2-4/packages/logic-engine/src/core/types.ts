export type QuestionType =
  | 'SingleChoice'
  | 'MultipleChoice'
  | 'Text'
  | 'Number'
  | 'Rating'
  | 'Matrix';

export type RuleAction = 'show' | 'hide';
export type GroupOperator = 'AND' | 'OR';
export type RuleOperator = 'equals' | 'not_equals' | 'contains';

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  is_required: boolean;
  order: number;
};

export type LogicRule = {
  id: string;
  source_question_id: string;
  operator: RuleOperator;
  value: string;
};

export type RuleGroup = {
  id: string;
  target_question_id: string;
  action: RuleAction;
  group_operator: GroupOperator;
  rules: LogicRule[];
};

export type SurveySnapshot = {
  survey: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    is_anonymous: boolean;
    status: 'Draft' | 'Published' | 'Closed';
  };
  publish_hash: string;
  questions: Question[];
  rule_groups: RuleGroup[];
};

export type AnswerValue = unknown;
export type AnswersByQuestionId = Record<string, AnswerValue>;

export type VisibilityResult = {
  visible_question_ids: string[];
  hidden_question_ids: string[];
};
