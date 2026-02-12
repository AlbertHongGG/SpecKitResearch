import type { AnswersByQuestionId, RuleGroup } from './types.js';

function evalOperator(answer: unknown, operator: RuleGroup['rules'][number]['operator'], value: string): boolean {
  if (operator === 'equals') return String(answer) === value;
  if (operator === 'not_equals') return String(answer) !== value;

  if (operator === 'contains') {
    if (Array.isArray(answer)) return answer.map(String).includes(value);
    if (typeof answer === 'string') return answer.includes(value);
    return false;
  }

  return false;
}

export function evaluateRuleGroup(group: RuleGroup, answers: AnswersByQuestionId): boolean {
  const results = group.rules.map((rule) =>
    evalOperator(answers[rule.source_question_id], rule.operator, rule.value),
  );

  if (group.group_operator === 'AND') return results.every(Boolean);
  return results.some(Boolean);
}
