import { requireRole } from '@/lib/auth/guards';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listReviewQueue } from '@/services/adminRepo';

export const GET = withErrorHandling(async () => {
  await requireRole(['admin']);
  const courses = await listReviewQueue();
  return ok({ courses });
});
