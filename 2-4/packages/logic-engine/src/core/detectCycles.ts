import type { SurveySnapshot } from './types.js';

export type CycleResult = {
  cycle_path_question_ids: string[];
};

export function detectCycles(snapshot: SurveySnapshot): CycleResult | null {
  const graph = new Map<string, Set<string>>();
  for (const q of snapshot.questions) {
    graph.set(q.id, new Set());
  }
  for (const group of snapshot.rule_groups) {
    for (const rule of group.rules) {
      if (!graph.has(rule.source_question_id)) continue;
      graph.get(rule.source_question_id)!.add(group.target_question_id);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (node: string): CycleResult | null => {
    visiting.add(node);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      if (visiting.has(next)) {
        const start = stack.indexOf(next);
        const path = stack.slice(start).concat(next);
        return { cycle_path_question_ids: path };
      }
      if (!visited.has(next)) {
        const res = dfs(next);
        if (res) return res;
      }
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  };

  for (const q of snapshot.questions) {
    if (visited.has(q.id)) continue;
    const res = dfs(q.id);
    if (res) return res;
  }

  return null;
}
