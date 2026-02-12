import type { RuleGroup } from '@app/contracts';
import { evaluateOperator } from './operators';
import type { AnswerMap } from './types';

export function evaluateRuleGroup(ruleGroup: RuleGroup, answers: AnswerMap): boolean {
  const results = ruleGroup.rules.map((rule) => {
    const actual = answers[rule.source_question_id];
    return evaluateOperator(rule.operator, actual, rule.value);
  });

  if (ruleGroup.mode === 'AND') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}
