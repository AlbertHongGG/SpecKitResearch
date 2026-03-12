'use client';

import Link from 'next/link';
import { useMe } from '../lib/require-auth';

export default function HomePage() {
  const me = useMe();
  const user = me.data?.user ?? null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Trello Lite</h1>
      <p className="mt-2 text-slate-700">多使用者協作待辦系統（Trello Lite）。</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {user ? (
          <>
            <p className="text-slate-700">
              你好，<span className="font-medium">{user.displayName}</span>
            </p>
            <Link
              href="/projects"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              前往專案列表
            </Link>
          </>
        ) : (
          <>
            <p className="text-slate-700">請先登入或註冊。</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/login"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                登入
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                註冊
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
