import { PrismaClient, SurveyStatus, QuestionType, RuleAction, GroupOperator, RuleOperator } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildPublishHashPayloadV1, computePublishHashNode } from '@app/canonicalization';

const prisma = new PrismaClient();

async function main() {
  const demoPasswordHash = bcrypt.hashSync('demo', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      id: 'user_demo',
      username: 'demo',
      passwordHash: demoPasswordHash
    }
  });

  // Create a deterministic, simple published survey used by quickstart and US1.
  const surveyId = 'survey_demo';

  // Idempotent reseed: delete dependents first to satisfy FK constraints.
  await prisma.answer.deleteMany({ where: { response: { surveyId } } });
  await prisma.response.deleteMany({ where: { surveyId } });
  await prisma.logicRule.deleteMany({ where: { ruleGroup: { surveyId } } });
  await prisma.ruleGroup.deleteMany({ where: { surveyId } });
  await prisma.option.deleteMany({ where: { question: { surveyId } } });
  await prisma.question.deleteMany({ where: { surveyId } });
  await prisma.survey.deleteMany({ where: { id: surveyId } });

  await prisma.survey.create({
    data: {
      id: surveyId,
      ownerUserId: user.id,
      slug: 'demo',
      title: 'Demo Survey',
      description: 'A simple seeded survey for development and tests.',
      status: SurveyStatus.DRAFT,
      isAnonymous: true,
      questions: {
        create: [
          {
            id: 'q1',
            order: 1,
            type: QuestionType.SC,
            required: true,
            title: 'Q1',
            description: 'Choose yes/no',
            options: {
              create: [
                { id: 'o1', order: 1, value: 'yes', label: 'Yes' },
                { id: 'o2', order: 2, value: 'no', label: 'No' }
              ]
            }
          },
          {
            id: 'q2',
            order: 2,
            type: QuestionType.TEXT,
            required: false,
            title: 'Q2',
            description: 'Only visible when Q1=yes'
          }
        ]
      },
      ruleGroups: {
        create: [
          {
            id: 'rg1',
            targetQuestionId: 'q2',
            action: RuleAction.SHOW,
            operator: GroupOperator.AND,
            order: 1,
            rules: {
              create: [
                {
                  id: 'r1',
                  sourceQuestionId: 'q1',
                  operator: RuleOperator.EQUALS,
                  valueJson: 'yes',
                  order: 1
                }
              ]
            }
          }
        ]
      }
    }
  });

  const survey = await prisma.survey.findUniqueOrThrow({
    where: { id: surveyId },
    include: {
      questions: { include: { options: true }, orderBy: { order: 'asc' } },
      ruleGroups: { include: { rules: true }, orderBy: { order: 'asc' } }
    }
  });

  const publishPayload = buildPublishHashPayloadV1({
    survey_id: survey.id,
    slug: survey.slug,
    questions: survey.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      required: q.required,
      title: q.title,
      description: q.description,
      options: q.options
        .sort((a, b) => a.order - b.order)
        .map((o) => ({ id: o.id, order: o.order, value: o.value, label: o.label }))
    })),
    rule_groups: survey.ruleGroups.map((g) => ({
      id: g.id,
      target_question_id: g.targetQuestionId,
      action: g.action,
      mode: g.operator,
      order: g.order,
      rules: g.rules
        .sort((a, b) => a.order - b.order)
        .map((r) => ({
          id: r.id,
          source_question_id: r.sourceQuestionId,
          operator: r.operator,
          value: r.valueJson,
          order: r.order
        }))
    }))
  });

  const publishHash = computePublishHashNode(publishPayload);

  await prisma.survey.update({
    where: { id: surveyId },
    data: {
      status: SurveyStatus.PUBLISHED,
      publishHash
    }
  });

  // eslint-disable-next-line no-console
  console.log('Seeded demo user and survey', { username: 'demo', password: 'demo', surveySlug: 'demo', publishHash });
}

main()
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
