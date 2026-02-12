import { ApiError } from "@/lib/errors/apiError";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/server/repositories/userRepository";
import { createSessionRow } from "@/server/repositories/sessionRepository";

function newSessionId() {
  return crypto.randomUUID();
}

export async function authLogin(input: { email: string; password: string; meta?: { ip?: string; userAgent?: string } }) {
  const user = await findUserByEmail(input.email);
  if (!user) throw ApiError.notAuthenticated("帳號或密碼錯誤");

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.notAuthenticated("帳號或密碼錯誤");

  if (user.isBanned) throw ApiError.forbidden("帳號已停權");

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
