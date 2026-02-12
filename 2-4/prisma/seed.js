const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

function assertSerializable(value) {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
    throw new Error('Non-canonical number');
  }
  if (typeof value === 'undefined') {
    throw new Error('undefined is not allowed in canonical JSON');
  }
}

function canonicalStringify(value) {
  assertSerializable(value);

  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value;
    const keys = Object.keys(obj).sort();
    const parts = [];
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === 'undefined') continue;
      parts.push(`${JSON.stringify(key)}:${canonicalStringify(v)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw new Error('Unsupported type for canonical JSON');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

async function main() {
  const prisma = new PrismaClient();

  const demoEmail = 'demo@example.com';
  const demoPassword = 'demo1234';
  const slug = 'demo-survey';

  const existing = await prisma.survey.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Seed skipped: survey already exists (slug=${slug})`);
    await prisma.$disconnect();
    return;
  }

  const password_hash = await bcrypt.hash(demoPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, password_hash },
  });

  const survey = await prisma.survey.create({
    data: {
      owner_user_id: user.id,
      slug,
      title: 'Demo Survey (Dynamic Logic)',
      description: 'A small seeded survey for US1/US2/US3 demos.',
      is_anonymous: false,
      status: 'Draft',
    },
  });

  const q1 = await prisma.question.create({
    data: {
      survey_id: survey.id,
      type: 'SingleChoice',
      title: 'Do you have a pet?',
      is_required: true,
      order: 1,
    },
  });

  const q1optYes = await prisma.option.create({
    data: {
      question_id: q1.id,
      label: 'Yes',
      value: 'yes',
    },
  });

  const q1optNo = await prisma.option.create({
    data: {
      question_id: q1.id,
      label: 'No',
      value: 'no',
    },
  });

  const q2 = await prisma.question.create({
    data: {
      survey_id: survey.id,
      type: 'Text',
      title: "What's your pet's name?",
      is_required: true,
      order: 2,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      survey_id: survey.id,
      type: 'Rating',
      title: 'How much do you like animals? (1-5)',
      is_required: true,
      order: 3,
    },
  });

  const group = await prisma.ruleGroup.create({
    data: {
      survey_id: survey.id,
      target_question_id: q2.id,
      action: 'show',
      group_operator: 'AND',
    },
  });

  const rule = await prisma.logicRule.create({
    data: {
      rule_group_id: group.id,
      source_question_id: q1.id,
      operator: 'equals',
      value: q1optYes.value,
    },
  });

  const schema_json = {
    survey: {
      id: survey.id,
      slug: survey.slug,
      title: survey.title,
      description: survey.description,
      is_anonymous: survey.is_anonymous,
      status: 'Published',
    },
    questions: [q1, q2, q3],
    options: [q1optYes, q1optNo],
    rule_groups: [
      {
        id: group.id,
        target_question_id: group.target_question_id,
        action: group.action,
        group_operator: group.group_operator,
        rules: [
          {
            id: rule.id,
            source_question_id: rule.source_question_id,
            operator: rule.operator,
            value: rule.value,
          },
        ],
      },
    ],
  };

  const publish_hash = `sha256:${sha256Hex(canonicalStringify(schema_json))}`;

  await prisma.survey.update({
    where: { id: survey.id },
    data: { status: 'Published', publish_hash },
  });

  await prisma.surveyPublish.create({
    data: {
      survey_id: survey.id,
      publish_hash,
      schema_json,
    },
  });

  console.log('Seed complete:');
  console.log(`- demo user: ${demoEmail} / ${demoPassword}`);
  console.log(`- published survey slug: ${slug}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
