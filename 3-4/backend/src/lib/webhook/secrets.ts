import crypto from 'node:crypto';
import { loadConfig } from '../config.js';

function getKey(): Buffer {
  const cfg = loadConfig();
  const key = Buffer.from(cfg.SECRET_ENCRYPTION_KEY_BASE64, 'base64');
  if (key.length !== 32) {
    throw new Error('SECRET_ENCRYPTION_KEY_BASE64 must be 32 bytes (base64)');
  }
  return key;
}

export function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptSecret(ciphertextB64: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertextB64, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`;
}
