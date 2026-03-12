import bcrypt from 'bcryptjs';

import { getEnv } from '../config/env';

const SALT_ROUNDS = 12;

function peppered(password: string): string {
  const env = getEnv();
  return `${password}${env.PASSWORD_HASH_PEPPER}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(peppered(password), SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(peppered(password), passwordHash);
}
