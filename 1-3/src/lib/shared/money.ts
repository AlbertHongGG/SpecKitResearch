export function formatAmount(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${abs.toLocaleString('zh-TW')}`;
}
