"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { Pagination } from "@/components/Pagination";
import { ThreadCard } from "@/components/ThreadCard";
import { usePublicSearch } from "@/lib/queries/search";

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const q0 = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));

  const [q, setQ] = useState(q0);
  const searchQ = usePublicSearch(q0, page);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">搜尋</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(q)}&page=1`);
        }}
      >
        <input
          className="w-full rounded border bg-white px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="輸入關鍵字"
        />
        <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white">搜尋</button>
      </form>

      {q0.trim().length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">請輸入關鍵字</div>
      ) : searchQ.isLoading ? (
        <Loading label="搜尋中…" />
      ) : searchQ.isError ? (
        <ErrorBanner error={searchQ.error} />
      ) : (
        <>
          {searchQ.data!.items.length === 0 ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">沒有結果</div>
          ) : (
            <div className="space-y-3">
              {searchQ.data!.items.map((t) => (
                <ThreadCard key={t.id} thread={t} />
              ))}
            </div>
          )}

          <Pagination
            page={searchQ.data!.pageInfo.page}
            pageSize={searchQ.data!.pageInfo.pageSize}
            total={searchQ.data!.pageInfo.total}
            onChange={(p) => router.push(`/search?q=${encodeURIComponent(q0)}&page=${p}`)}
          />
        </>
      )}
    </div>
  );
}
