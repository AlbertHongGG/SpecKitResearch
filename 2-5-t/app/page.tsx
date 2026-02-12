import Link from "next/link";

import { prisma } from "@/src/infra/db/prisma";
import { listBoards } from "@/src/usecases/boards/listBoards";

export default async function HomePage() {
  const { boards } = await listBoards(prisma);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">多角色論壇／社群平台</h1>
      <p className="mt-3 text-sm text-neutral-600">
        這是依照 SpecKit 規格落地的完整系統實作（Next.js App Router + Prisma + SQLite）。
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          href="/search"
        >
          進入搜尋
        </Link>
        <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/login?returnTo=/">
          登入
        </Link>
      </div>

      <div className="mt-10 rounded-lg border bg-white p-4">
        <h2 className="text-base font-semibold">看板</h2>
        <div className="mt-3 grid gap-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              className="rounded-md border px-4 py-3 hover:bg-neutral-50"
              href={`/boards/${b.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{b.name}</div>
                  {b.description ? (
                    <div className="mt-1 text-xs text-neutral-600">{b.description}</div>
                  ) : null}
                </div>
                {!b.isActive ? (
                  <span className="rounded bg-neutral-200 px-2 py-1 text-xs text-neutral-700">
                    Inactive
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
