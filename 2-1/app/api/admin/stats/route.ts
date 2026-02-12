import { requireRole } from '@/lib/auth/guards';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { getStats } from '@/services/adminRepo';

export const GET = withErrorHandling(async () => {
  await requireRole(['admin']);
  const stats = await getStats();
  return ok(stats);
});
