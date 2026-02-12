'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto max-w-md py-16">
            <h1 className="text-xl font-semibold">發生錯誤</h1>
            <p className="mt-2 text-sm text-slate-600">請重新整理或稍後再試。</p>
            <button
                className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => reset()}
            >
                重試
            </button>
        </div>
    );
}
