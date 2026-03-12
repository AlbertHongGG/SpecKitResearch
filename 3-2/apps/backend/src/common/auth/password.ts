import argon2 from 'argon2';

const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
};

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function verifyAndRehashPassword(
  hash: string,
  password: string,
): Promise<{ ok: boolean; newHash?: string }> {
  const ok = await verifyPassword(hash, password);
  if (!ok) return { ok: false };

  // If argon2 params change over time, rehash to keep stored hashes up to date.
  const needsRehash = typeof (argon2 as any).needsRehash === 'function'
    ? await (argon2 as any).needsRehash(hash, HASH_OPTIONS)
    : false;

  if (!needsRehash) return { ok: true };
  return { ok: true, newHash: await hashPassword(password) };
}
