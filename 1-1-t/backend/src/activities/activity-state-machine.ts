import type { ActivityStatus } from '@prisma/client';

export type ActivityTransitionAction = 'publish' | 'unpublish' | 'close' | 'archive';

export function applyActivityTransition(input: {
  from: ActivityStatus;
  action: ActivityTransitionAction;
}): ActivityStatus | null {
  const { from, action } = input;

  if (action === 'publish') {
    return from === 'draft' ? 'published' : null;
  }

  if (action === 'unpublish') {
    return from === 'published' ? 'draft' : null;
  }

  if (action === 'close') {
    return from === 'published' || from === 'full' ? 'closed' : null;
  }

  if (action === 'archive') {
    return from === 'draft' || from === 'closed' ? 'archived' : null;
  }

  return null;
}
