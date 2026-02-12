import { encodePositionValue, POSITION_MAX_VALUE } from './position';

export async function rebalanceListPositions(
  tx: any,
  listId: string
): Promise<void> {
  const tasks = await tx.task.findMany({
    where: { listId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });

  const n = tasks.length;
  if (n === 0) return;

  const step = POSITION_MAX_VALUE / BigInt(n + 1);
  if (step <= 0n) return;

  // Two-phase update to avoid temporary unique collisions.
  for (const t of tasks) {
    await tx.task.update({
      where: { id: t.id },
      data: { position: `tmp:${t.id}` },
    });
  }

  for (let i = 0; i < tasks.length; i += 1) {
    const t = tasks[i]!;
    const nextPos = encodePositionValue(step * BigInt(i + 1));
    await tx.task.update({
      where: { id: t.id },
      data: { position: nextPos },
    });
  }
}
