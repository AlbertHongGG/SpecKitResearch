import { ApiError } from '../observability/errors.js';

export type ReviewTaskStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export function assertTaskCanAct(status: ReviewTaskStatus) {
  if (status !== 'Pending') {
    throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Task already acted' });
  }
}
