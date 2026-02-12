import { PrismaClient, TargetType } from "@prisma/client";

type Problem = { kind: string; message: string };

async function checkReports(prisma: PrismaClient, problems: Problem[]) {
  const reports = await prisma.report.findMany({
    select: { id: true, boardId: true, targetType: true, targetId: true },
  });

  for (const r of reports) {
    if (r.targetType === TargetType.thread) {
      const thread = await prisma.thread.findUnique({
        where: { id: r.targetId },
        select: { id: true, boardId: true },
      });
      if (!thread) {
        problems.push({ kind: "Report", message: `Report ${r.id}: thread target missing (${r.targetId})` });
        continue;
      }
      if (thread.boardId !== r.boardId) {
        problems.push({
          kind: "Report",
          message: `Report ${r.id}: boardId mismatch (report ${r.boardId} vs thread ${thread.boardId})`,
        });
      }
    } else if (r.targetType === TargetType.post) {
      const post = await prisma.post.findUnique({
        where: { id: r.targetId },
        select: { id: true, thread: { select: { boardId: true } } },
      });
      if (!post) {
        problems.push({ kind: "Report", message: `Report ${r.id}: post target missing (${r.targetId})` });
        continue;
      }
      if (post.thread.boardId !== r.boardId) {
        problems.push({
          kind: "Report",
          message: `Report ${r.id}: boardId mismatch (report ${r.boardId} vs post.thread.boardId ${post.thread.boardId})`,
        });
      }
    } else {
      problems.push({ kind: "Report", message: `Report ${r.id}: unknown targetType ${String(r.targetType)}` });
    }
  }
}

async function checkLikes(prisma: PrismaClient, problems: Problem[]) {
  const likes = await prisma.like.findMany({
    select: { id: true, targetType: true, targetId: true },
  });

  for (const l of likes) {
    if (l.targetType === TargetType.thread) {
      const thread = await prisma.thread.findUnique({ where: { id: l.targetId }, select: { id: true } });
      if (!thread) {
        problems.push({ kind: "Like", message: `Like ${l.id}: thread target missing (${l.targetId})` });
      }
    } else if (l.targetType === TargetType.post) {
      const post = await prisma.post.findUnique({ where: { id: l.targetId }, select: { id: true } });
      if (!post) {
        problems.push({ kind: "Like", message: `Like ${l.id}: post target missing (${l.targetId})` });
      }
    } else {
      problems.push({ kind: "Like", message: `Like ${l.id}: unknown targetType ${String(l.targetType)}` });
    }
  }
}

async function checkThreadFts(prisma: PrismaClient, problems: Problem[]) {
  try {
    const missing = await prisma.$queryRaw<Array<{ missing: number }>>`
      SELECT COUNT(*) AS missing
      FROM Thread t
      LEFT JOIN thread_fts f ON f.threadId = t.id
      WHERE f.threadId IS NULL
    `;
    const extra = await prisma.$queryRaw<Array<{ extra: number }>>`
      SELECT COUNT(*) AS extra
      FROM thread_fts f
      LEFT JOIN Thread t ON t.id = f.threadId
      WHERE t.id IS NULL
    `;

    const missingCount = Number((missing[0] as any)?.missing ?? 0);
    const extraCount = Number((extra[0] as any)?.extra ?? 0);

    if (missingCount > 0) {
      problems.push({ kind: "FTS", message: `thread_fts missing rows for ${missingCount} thread(s)` });
    }
    if (extraCount > 0) {
      problems.push({ kind: "FTS", message: `thread_fts has ${extraCount} extra row(s) without Thread` });
    }
  } catch {
    problems.push({ kind: "FTS", message: "thread_fts not present or not queryable (migration not applied?)" });
  }
}

async function main() {
  const prisma = new PrismaClient();
  const problems: Problem[] = [];

  try {
    await prisma.$connect();

    await checkReports(prisma, problems);
    await checkLikes(prisma, problems);
    await checkThreadFts(prisma, problems);

    if (problems.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[integrity-check] OK");
      return;
    }

    // eslint-disable-next-line no-console
    console.error(`[integrity-check] FAIL (${problems.length} problem(s))`);
    for (const p of problems) {
      // eslint-disable-next-line no-console
      console.error(`- [${p.kind}] ${p.message}`);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
