import type { PrismaClient } from '@prisma/client';

const STRUCTURE_MODELS = new Set(['Question', 'Option', 'RuleGroup', 'LogicRule']);
const STRUCTURE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert']);

type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

type MiddlewareParams = {
  model?: string;
  action: string;
  args?: any;
};

type MiddlewareNext = (params: unknown) => Promise<unknown>;

async function resolveSurveyIdForStructureMutation(prisma: PrismaClient, params: MiddlewareParams) {
  const model = params.model ?? '';
  const action = params.action;

  if (model === 'Question') {
    if (action === 'create') {
      return params.args?.data?.surveyId as string | undefined;
    }
    const id = params.args?.where?.id as string | undefined;
    if (!id) return undefined;
    const q = await prisma.question.findUnique({ where: { id }, select: { surveyId: true } });
    return q?.surveyId;
  }

  if (model === 'Option') {
    if (action === 'create') {
      const questionId = params.args?.data?.questionId as string | undefined;
      if (!questionId) return undefined;
      const q = await prisma.question.findUnique({ where: { id: questionId }, select: { surveyId: true } });
      return q?.surveyId;
    }
    const id = params.args?.where?.id as string | undefined;
    if (!id) return undefined;
    const opt = await prisma.option.findUnique({
      where: { id },
      select: { question: { select: { surveyId: true } } }
    });
    return opt?.question.surveyId;
  }

  if (model === 'RuleGroup') {
    if (action === 'create') {
      return params.args?.data?.surveyId as string | undefined;
    }
    const id = params.args?.where?.id as string | undefined;
    if (!id) return undefined;
    const g = await prisma.ruleGroup.findUnique({ where: { id }, select: { surveyId: true } });
    return g?.surveyId;
  }

  if (model === 'LogicRule') {
    if (action === 'create') {
      const ruleGroupId = params.args?.data?.ruleGroupId as string | undefined;
      if (!ruleGroupId) return undefined;
      const g = await prisma.ruleGroup.findUnique({ where: { id: ruleGroupId }, select: { surveyId: true } });
      return g?.surveyId;
    }
    const id = params.args?.where?.id as string | undefined;
    if (!id) return undefined;
    const r = await prisma.logicRule.findUnique({
      where: { id },
      select: { ruleGroup: { select: { surveyId: true } } }
    });
    return r?.ruleGroup.surveyId;
  }

  return undefined;
}

export function installSchemaLockMiddleware(prisma: PrismaClient) {
  const use = (prisma as any).$use as undefined | ((cb: any) => void);
  if (typeof use !== 'function') return;

  use(async (params: MiddlewareParams, next: MiddlewareNext) => {
    if (!STRUCTURE_MODELS.has(params.model ?? '') || !STRUCTURE_ACTIONS.has(params.action)) {
      return next(params);
    }

    // Keep enforcement deterministic and safe: bulk mutations are too hard to
    // preflight correctly without expensive queries.
    if (params.action === 'createMany' || params.action === 'updateMany' || params.action === 'deleteMany') {
      throw new Error(`SCHEMA_LOCK_BULK_DISALLOWED:${params.model}:${params.action}`);
    }

    const surveyId = await resolveSurveyIdForStructureMutation(prisma, params);
    if (!surveyId) return next(params);

    const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { status: true } });
    if (!survey) return next(params);

    const status = survey.status as SurveyStatus;
    if (status !== 'DRAFT') throw new Error(`SCHEMA_LOCKED:${surveyId}:${status}`);

    return next(params);
  });
}
