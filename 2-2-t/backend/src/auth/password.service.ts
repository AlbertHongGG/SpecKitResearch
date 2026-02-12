import crypto from 'node:crypto';

export class PasswordService {
  hash(password: string): string {
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
  }

  verify(password: string, passwordHash: string): boolean {
    const [algo, saltHex, hashHex] = passwordHash.split('$');
    if (algo !== 'scrypt' || !saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  }
}
