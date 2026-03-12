import { HttpError } from '../../http/errors';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' as const;
const BASE = BigInt(ALPHABET.length);

export const POSITION_WIDTH = 10 as const;
export type PositionKey = string;

export const POSITION_MAX_VALUE = BASE ** BigInt(POSITION_WIDTH) - 1n;

function assertValidKey(key: string): void {
  if (key.length !== POSITION_WIDTH) {
    throw new HttpError(422, 'VALIDATION_ERROR', `Invalid position key length (expected ${POSITION_WIDTH})`, {
      key,
      expectedLength: POSITION_WIDTH,
    });
  }
  for (const ch of key) {
    if (!ALPHABET.includes(ch as any)) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid position key character', { key, ch });
    }
  }
}

function decode(key: string): bigint {
  assertValidKey(key);
  let value = 0n;
  for (const ch of key) {
    const digit = BigInt(ALPHABET.indexOf(ch));
    value = value * BASE + digit;
  }
  return value;
}

function encode(value: bigint): string {
  if (value < 0n) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Position value must be non-negative');
  }
  let v = value;
  const digits: string[] = Array(POSITION_WIDTH).fill('0');
  for (let i = POSITION_WIDTH - 1; i >= 0; i -= 1) {
    const digit = Number(v % BASE);
    digits[i] = ALPHABET[digit] as string;
    v = v / BASE;
  }
  return digits.join('');
}

export function encodePositionValue(value: bigint): PositionKey {
  return encode(value);
}

export function isPositionStrictlyBetween(
  prev: PositionKey | null,
  mid: PositionKey,
  next: PositionKey | null,
): boolean {
  if (prev !== null && !(prev < mid)) return false;
  if (next !== null && !(mid < next)) return false;
  return true;
}

export function generateBetween(prev: PositionKey | null, next: PositionKey | null): PositionKey {
  const a = prev === null ? 0n : decode(prev);
  const b = next === null ? POSITION_MAX_VALUE : decode(next);

  if (a >= b) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid ordering bounds (prev must be < next)', {
      prev,
      next,
    });
  }

  const mid = (a + b) / 2n;
  if (mid === a || mid === b) {
    throw new HttpError(409, 'VERSION_CONFLICT', 'No space left between ordering keys; rebalance required', {
      prev,
      next,
    });
  }

  return encode(mid);
}
