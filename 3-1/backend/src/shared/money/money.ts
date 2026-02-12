export type Money = number;

export function sumMoney(values: Money[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

export function formatMoney(amount: Money, currency = 'TWD') {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency }).format(amount / 100);
}
