import { describe, expect, it } from 'vitest';

import { assertSprintCloseAllowed, assertSprintStartAllowed } from '../../../apps/backend/src/modules/sprints/sprint-state';

describe('sprint state transitions', () => {
  it('allows planned → active (start)', () => {
    expect(() => assertSprintStartAllowed('planned')).not.toThrow();
  });

  it('denies start unless planned', () => {
    expect(() => assertSprintStartAllowed('active' as any)).toThrow();
    expect(() => assertSprintStartAllowed('closed' as any)).toThrow();
  });

  it('allows active → closed (close)', () => {
    expect(() => assertSprintCloseAllowed('active')).not.toThrow();
  });

  it('denies close unless active', () => {
    expect(() => assertSprintCloseAllowed('planned' as any)).toThrow();
    expect(() => assertSprintCloseAllowed('closed' as any)).toThrow();
  });
});
