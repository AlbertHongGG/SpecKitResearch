import { clearSessionCookie, getSessionCookie } from '@/lib/auth/cookies';
import { revokeSessionByToken } from '@/lib/auth/sessionStore';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { assertSameOrigin } from '@/lib/security/sameOrigin';

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);

  const token = await getSessionCookie();
  if (token) {
    await revokeSessionByToken(token);
  }
  await clearSessionCookie();

  return ok({ success: true });
});
