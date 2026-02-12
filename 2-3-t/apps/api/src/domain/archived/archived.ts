import { ERROR_CODES } from '@trello-lite/shared';
import { HttpError } from '../../http/errors';

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';

export type ArchiveStatus = 'active' | 'archived';

export type ArchivedScope = {
  projectStatus: ArchiveStatus;
  boardStatus?: ArchiveStatus;
  listStatus?: ArchiveStatus;
  taskStatus?: TaskStatus;
};

export function assertWritableScope(scope: ArchivedScope): void {
  if (scope.projectStatus === 'archived') {
    throw new HttpError(409, ERROR_CODES.ARCHIVED_READ_ONLY, 'Archived scope is read-only', {
      scope: 'project',
    });
  }

  if (scope.boardStatus === 'archived') {
    throw new HttpError(409, ERROR_CODES.ARCHIVED_READ_ONLY, 'Archived scope is read-only', {
      scope: 'board',
    });
  }

  if (scope.listStatus === 'archived') {
    throw new HttpError(409, ERROR_CODES.ARCHIVED_READ_ONLY, 'Archived scope is read-only', {
      scope: 'list',
    });
  }

  if (scope.taskStatus === 'archived') {
    throw new HttpError(409, ERROR_CODES.ARCHIVED_READ_ONLY, 'Archived scope is read-only', {
      scope: 'task',
    });
  }
}
