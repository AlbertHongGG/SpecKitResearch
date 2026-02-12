import { requireRole } from '@/lib/auth/guards';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listUsers } from '@/services/adminRepo';

export const GET = withErrorHandling(async () => {
  await requireRole(['admin']);
  const users = await listUsers();
  return ok({ users });
});
