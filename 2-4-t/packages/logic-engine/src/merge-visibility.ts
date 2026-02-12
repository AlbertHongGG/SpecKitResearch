import type { RuleGroup } from '@app/contracts';

export function computeVisibilityForTarget(ruleGroups: RuleGroup[], matched: Map<string, boolean>): boolean {
  const hides = ruleGroups.filter((g) => g.action === 'hide');
  const shows = ruleGroups.filter((g) => g.action === 'show');

  const anyHideMatched = hides.some((g) => matched.get(g.id) === true);
  if (anyHideMatched) {
    return false;
  }

  if (shows.length > 0) {
    const anyShowMatched = shows.some((g) => matched.get(g.id) === true);
    return anyShowMatched;
  }

  return true;
}
