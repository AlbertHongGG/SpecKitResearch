import { LeaveRequestStatus } from '@prisma/client';
import { conflictWithCurrentState } from '../../common/http/conflict.util';

export function assertStatus(
    current: LeaveRequestStatus,
    expected: LeaveRequestStatus,
    message = 'Leave request status has changed',
) {
    if (current !== expected) {
        throw conflictWithCurrentState({
            code: 'INVALID_STATE_TRANSITION',
            message,
            current: { status: current, expected },
        });
    }
}
