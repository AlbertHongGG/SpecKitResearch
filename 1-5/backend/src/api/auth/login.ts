import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { unauthorized } from '../../lib/httpError.js';
import { findUserByEmail } from '../../repo/userRepo.js';
import { verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken } from '../../lib/jwt.js';
import { setAuthCookies } from '../../lib/cookies.js';
import { issueCsrfToken } from '../../lib/csrf.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginBody = z.infer<typeof LoginSchema>;

export async function registerLoginRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    '/auth/login',
    async (request, reply) => {
      const body = LoginSchema.parse(request.body);

      const user = await findUserByEmail(body.email);
      if (!user) throw unauthorized('Invalid credentials');

      const ok = await verifyPassword(body.password, user.passwordHash);
      if (!ok) throw unauthorized('Invalid credentials');

      const accessToken = await signAccessToken({ sub: user.id, role: user.role, email: user.email });
      const refreshToken = await signRefreshToken({ sub: user.id });

      setAuthCookies(reply, { accessToken, refreshToken });
      issueCsrfToken(reply);

      return reply.send({ id: user.id, email: user.email, role: user.role });
    },
  );
}
