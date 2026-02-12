import type { PublicSurvey, SurveySummary, SurveyDetail } from '@app/contracts';

type DbSurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
type DbQuestionType = 'SC' | 'MC' | 'TEXT' | 'NUMBER' | 'RATING' | 'MATRIX';
type DbRuleOperator = 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS';

type DbOption = { id: string; order: number; label: string; value: string };
type DbQuestion = {
  id: string;
  order: number;
  type: DbQuestionType;
  required: boolean;
  title: string;
  description: string | null;
  options: DbOption[];
};

type DbLogicRule = {
  id: string;
  order: number;
  sourceQuestionId: string;
  operator: DbRuleOperator;
  valueJson: unknown;
};

type DbRuleGroup = {
  id: string;
  order: number;
  targetQuestionId: string;
  action: 'SHOW' | 'HIDE';
  operator: 'AND' | 'OR';
  rules: DbLogicRule[];
};

type DbSurvey = {
  id: string;
  slug: string;
  title: string;
  status: DbSurveyStatus;
  isAnonymous: boolean;
  createdAt: Date;
  publishHash: string | null;
  ownerUserId: string;
  description: string | null;
};

type SurveyWithRelations = DbSurvey & {
  questions: DbQuestion[];
  ruleGroups: DbRuleGroup[];
};

function toQuestionType(t: DbQuestionType) {
  return t;
}

function toRuleOperator(op: DbRuleOperator) {
  switch (op) {
    case 'EQUALS':
      return 'equals' as const;
    case 'NOT_EQUALS':
      return 'not_equals' as const;
    case 'CONTAINS':
      return 'contains' as const;
  }
}

export function toSurveySummary(survey: DbSurvey): SurveySummary {
  return {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    status: survey.status,
    is_anonymous: survey.isAnonymous,
    created_at: survey.createdAt.toISOString(),
    publish_hash: survey.publishHash ?? null
  };
}

export function toSurveyDetail(survey: SurveyWithRelations): SurveyDetail {
  return {
    ...toSurveySummary(survey),
    owner_user_id: survey.ownerUserId,
    description: survey.description ?? null,
    questions: survey.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description ?? undefined,
        type: toQuestionType(q.type),
        required: q.required,
        options: q.options.length
          ? q.options
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ id: o.id, label: o.label, value: o.value }))
          : undefined
      })),
    rule_groups: survey.ruleGroups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((g) => ({
        id: g.id,
        target_question_id: g.targetQuestionId,
        action: g.action === 'SHOW' ? 'show' : 'hide',
        mode: g.operator,
        rules: g.rules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((r) => ({
            id: r.id,
            source_question_id: r.sourceQuestionId,
            operator: toRuleOperator(r.operator),
            value: r.valueJson
          }))
      }))
  };
}

export function toPublicSurveyForPreview(survey: SurveyWithRelations): PublicSurvey {
  return {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    description: survey.description ?? null,
    is_anonymous: survey.isAnonymous,
    questions: survey.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description ?? undefined,
        type: toQuestionType(q.type),
        required: q.required,
        options: q.options.length
          ? q.options
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ id: o.id, label: o.label, value: o.value }))
          : undefined
      })),
    rule_groups: survey.ruleGroups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((g) => ({
        id: g.id,
        target_question_id: g.targetQuestionId,
        action: g.action === 'SHOW' ? 'show' : 'hide',
        mode: g.operator,
        rules: g.rules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((r) => ({
            id: r.id,
            source_question_id: r.sourceQuestionId,
            operator: toRuleOperator(r.operator),
            value: r.valueJson
          }))
      }))
  };
}
