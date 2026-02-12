import crypto from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const derived = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, key) => {
            if (err) reject(err);
            else resolve(key as Buffer);
        });
    });

    return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('base64')}:${derived.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split(':');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4] ?? '', 'base64');
    const expected = Buffer.from(parts[5] ?? '', 'base64');

    const derived = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(password, salt, expected.length, { N, r, p }, (err, key) => {
            if (err) reject(err);
            else resolve(key as Buffer);
        });
    });

    return crypto.timingSafeEqual(expected, derived);
}
