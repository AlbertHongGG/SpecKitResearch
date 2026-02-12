import { currentUser } from '@/lib/auth/currentUser';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';

export const GET = withErrorHandling(async () => {
  const user = await currentUser();

  if (!user) {
    return ok({ user: null });
  }

  return ok({
    user: {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});
