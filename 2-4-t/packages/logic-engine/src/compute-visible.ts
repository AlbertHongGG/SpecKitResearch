import type { RuleGroup } from '@app/contracts';
import type { AnswerMap, SurveyLike, VisibilityResult } from './types';
import { evaluateRuleGroup } from './evaluate-rule-group';
import { computeVisibilityForTarget } from './merge-visibility';

export function computeVisibleQuestions(survey: SurveyLike, answers: AnswerMap, previousVisibleQuestionIds?: Set<string>): VisibilityResult {
  const ruleGroupsByTarget = new Map<string, RuleGroup[]>();
  for (const group of survey.rule_groups) {
    const arr = ruleGroupsByTarget.get(group.target_question_id) ?? [];
    arr.push(group);
    ruleGroupsByTarget.set(group.target_question_id, arr);
  }

  const matched = new Map<string, boolean>();
  for (const group of survey.rule_groups) {
    matched.set(group.id, evaluateRuleGroup(group, answers));
  }

  const visible = new Set<string>();
  for (const q of survey.questions) {
    const groups = ruleGroupsByTarget.get(q.id) ?? [];
    const isVisible = computeVisibilityForTarget(groups, matched);
    if (isVisible) {
      visible.add(q.id);
    }
  }

  const becameHidden: string[] = [];
  if (previousVisibleQuestionIds) {
    for (const qid of previousVisibleQuestionIds) {
      if (!visible.has(qid)) {
        becameHidden.push(qid);
      }
    }
  }

  return { visibleQuestionIds: visible, becameHiddenQuestionIds: becameHidden };
}
