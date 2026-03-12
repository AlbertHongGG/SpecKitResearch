'use client';

import Link from 'next/link';

import { useMe } from '../features/auth/useMe';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { data: me } = useMe();

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    <Link href="/projects" className="font-semibold">
                        Trello Lite
                    </Link>
                    <div className="text-sm text-slate-700">{me ? me.displayName : '未登入'}</div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
    );
}
