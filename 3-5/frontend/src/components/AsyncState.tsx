'use client';

export function AsyncState(props: {
    isLoading: boolean;
    error?: unknown;
    empty?: boolean;
    emptyLabel?: string;
    children: React.ReactNode;
}) {
    if (props.isLoading) {
        return <div className="py-8 text-sm text-slate-600">載入中…</div>;
    }

    if (props.error) {
        return <div className="py-8 text-sm text-red-700">發生錯誤，請稍後再試。</div>;
    }

    if (props.empty) {
        return <div className="py-8 text-sm text-slate-600">{props.emptyLabel ?? '目前沒有資料。'}</div>;
    }

    return <>{props.children}</>;
}
