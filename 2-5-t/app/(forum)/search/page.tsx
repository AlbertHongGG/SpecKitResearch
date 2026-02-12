"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { PageShell } from "@/src/ui/components/PageShell";
import { EmptyState, ErrorState, LoadingState } from "@/src/ui/components/States";

type SearchResponse = {
  results: Array<{ id: string; boardId: string; title: string; createdAt: string }>;
  pageInfo: { page: number; pageSize: number; total: number };
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const queryString = useMemo(() => {
    const qs = submittedQ?.trim();
    return qs && qs.length > 0 ? qs : null;
  }, [submittedQ]);

  const searchQuery = useQuery({
    queryKey: ["search", { q: queryString, page }],
    enabled: !!queryString,
    queryFn: async (): Promise<SearchResponse> => {
      const url = new URL("/api/search", window.location.origin);
      url.searchParams.set("q", queryString!);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "20");
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
  });

  const data = searchQuery.data;

  return (
    <PageShell title="搜尋">
      <div className="mt-4 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="輸入關鍵字" />
        <Button
          type="button"
          onClick={() => {
            setSubmittedQ(q);
            setPage(1);
          }}
        >
          搜尋
        </Button>
      </div>

      {!queryString ? (
        <EmptyState title="尚未搜尋" description="請輸入關鍵字開始搜尋。" />
      ) : searchQuery.isLoading ? (
        <LoadingState label="搜尋中…" />
      ) : searchQuery.isError ? (
        <ErrorState title="搜尋失敗" error={searchQuery.error} />
      ) : !data ? (
        <LoadingState label="搜尋中…" />
      ) : data.results.length === 0 ? (
        <EmptyState title="沒有找到結果" description="請嘗試不同關鍵字。" />
      ) : (
        <>
          <p className="mt-4 text-gray-600">
            共 {data.pageInfo.total} 筆
          </p>
          <ul className="mt-4 space-y-2">
            {data.results.map((r) => (
              <li key={r.id} className="rounded border border-gray-200 p-3 hover:bg-gray-50">
                <Link href={`/threads/${r.id}`} className="font-medium text-blue-700 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-2">
            <Button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              上一頁
            </Button>
            <span className="text-sm text-gray-600">第 {page} 頁</span>
            <Button
              type="button"
              disabled={page * data.pageInfo.pageSize >= data.pageInfo.total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一頁
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}

