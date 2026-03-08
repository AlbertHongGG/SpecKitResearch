export function calculateProrationCents(input: {
  fromPriceCents: number;
  toPriceCents: number;
  periodStart: Date;
  periodEnd: Date;
  at: Date;
}): number {
  const totalMs = input.periodEnd.getTime() - input.periodStart.getTime();
  if (totalMs <= 0) return 0;

  const clampedAt = new Date(
    Math.min(Math.max(input.at.getTime(), input.periodStart.getTime()), input.periodEnd.getTime()),
  );
  const remainingMs = input.periodEnd.getTime() - clampedAt.getTime();
  if (remainingMs <= 0) return 0;

  const diff = input.toPriceCents - input.fromPriceCents;
  if (diff <= 0) return 0;

  const raw = (diff * remainingMs) / totalMs;
  return Math.ceil(raw);
}
