import { ErrorCode } from '@app/contracts';

export function assertOrderOwnership(params: {
  orderUserId: string;
  requesterUserId: string;
}) {
  if (params.orderUserId !== params.requesterUserId) {
    const err = new Error('Forbidden');
    (err as Error & { statusCode?: number }).statusCode = 403;
    (err as Error & { code?: string }).code = ErrorCode.FORBIDDEN;
    throw err;
  }
}
