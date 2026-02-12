import type { RuleGroup } from '@app/contracts';
import type { DraftValidationError, DraftValidationResult, SurveyLike } from './types';

export function validateSurveyDraft(survey: SurveyLike): DraftValidationResult {
  const indexByQuestionId = new Map<string, number>();
  survey.questions.forEach((q, idx) => indexByQuestionId.set(q.id, idx));

  const errors: DraftValidationError[] = [];

  // forward-only
  for (const group of survey.rule_groups) {
    const targetIndex = indexByQuestionId.get(group.target_question_id);
    if (targetIndex === undefined) {
      continue;
    }
    for (const rule of group.rules) {
      const sourceIndex = indexByQuestionId.get(rule.source_question_id);
      if (sourceIndex === undefined) {
        continue;
      }
      if (sourceIndex >= targetIndex) {
        errors.push({
          code: 'FORWARD_ONLY_VIOLATION',
          message: `Rule source must be before target (source=${rule.source_question_id}, target=${group.target_question_id})`,
          source_question_id: rule.source_question_id,
          target_question_id: group.target_question_id,
          rule_group_id: group.id
        });
      }
    }
  }

  // cycle detection
  const edges = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    const s = edges.get(from) ?? new Set<string>();
    s.add(to);
    edges.set(from, s);
  };

  for (const group of survey.rule_groups) {
    for (const rule of group.rules) {
      addEdge(rule.source_question_id, group.target_question_id);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }
    visiting.add(node);
    for (const next of edges.get(node) ?? []) {
      if (dfs(next)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const q of survey.questions) {
    if (dfs(q.id)) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: 'Cycle detected in rule dependencies'
      });
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}
