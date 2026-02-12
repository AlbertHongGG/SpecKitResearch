import { ApiError } from "@/lib/errors/apiError";
import { hashPassword } from "@/lib/auth/password";
import { createUser, findUserByEmail } from "@/server/repositories/userRepository";
import { createSessionRow } from "@/server/repositories/sessionRepository";

function newSessionId() {
  return crypto.randomUUID();
}

export async function authRegister(input: { email: string; password: string; meta?: { ip?: string; userAgent?: string } }) {
  const existing = await findUserByEmail(input.email);
  if (existing) throw ApiError.conflict("Email 已被註冊");

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({ email: input.email, passwordHash });

  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await createSessionRow({
    id: sessionId,
    userId: user.id,
    expiresAt,
    ip: input.meta?.ip,
    userAgent: input.meta?.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
    },
    session: { id: sessionId, expiresAt },
  };
}
