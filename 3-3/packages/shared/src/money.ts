export type Money = {
  currency: string;
  cents: number;
};

export function assertMoney(m: Money): void {
  if (!m.currency || typeof m.currency !== 'string') throw new Error('currency required');
  if (!Number.isInteger(m.cents)) throw new Error('cents must be integer');
}
