import { verifyPassword } from '../../lib/password.js';
import { loadConfig } from '../../lib/config.js';
import { unauthorized } from '../../api/errors.js';
import { createSession } from '../../repositories/sessionRepo.js';
import { findUserByEmail } from '../../repositories/userRepo.js';

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw unauthorized('Invalid credentials');

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw unauthorized('Invalid credentials');

  const cfg = loadConfig();
  const session = await createSession(user.id, {
    idleSec: cfg.SESSION_IDLE_SEC,
    absoluteSec: cfg.SESSION_ABSOLUTE_SEC,
  });

  return { user, session };
}
