import { generateKeyBetween } from 'fractional-indexing';

export function generateBetween(prev: string | null, next: string | null): string {
    return generateKeyBetween(prev, next);
}
