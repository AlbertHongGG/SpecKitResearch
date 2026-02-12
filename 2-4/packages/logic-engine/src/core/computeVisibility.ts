import type { AnswersByQuestionId, SurveySnapshot, VisibilityResult } from './types.js';
import type { RuleGroup } from './types.js';
import { evaluateRuleGroup } from './evaluateRuleGroup.js';

function evalGroup(group: RuleGroup, answers: AnswersByQuestionId): boolean {
  return evaluateRuleGroup(group, answers);
}

/**
 * Implements FR-024 visibility merge semantics:
 * - Default visible
 * - Any hide group true => hidden
 * - Else if any show groups exist: any true => visible, else hidden
 */
export function computeVisibility(snapshot: SurveySnapshot, answers: AnswersByQuestionId): VisibilityResult {
  const questionsById = new Map(snapshot.questions.map((q) => [q.id, q] as const));
  const allIds = snapshot.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((q) => q.id);

  const visible = new Set(allIds);
  const groupsByTarget = new Map<string, RuleGroup[]>();
  for (const group of snapshot.rule_groups) {
    if (!questionsById.has(group.target_question_id)) continue;
    const list = groupsByTarget.get(group.target_question_id) ?? [];
    list.push(group);
    groupsByTarget.set(group.target_question_id, list);
  }

  for (const targetId of allIds) {
    const groups = groupsByTarget.get(targetId);
    if (!groups || groups.length === 0) continue;

    const hideGroups = groups.filter((g) => g.action === 'hide');
    const showGroups = groups.filter((g) => g.action === 'show');

    const anyHideTrue = hideGroups.some((g) => evalGroup(g, answers));
    if (anyHideTrue) {
      visible.delete(targetId);
      continue;
    }

    if (showGroups.length > 0) {
      const anyShowTrue = showGroups.some((g) => evalGroup(g, answers));
      if (!anyShowTrue) visible.delete(targetId);
    }
  }

  const visibleIds = allIds.filter((id) => visible.has(id));
  const hiddenIds = allIds.filter((id) => !visible.has(id));
  return { visible_question_ids: visibleIds, hidden_question_ids: hiddenIds };
}

