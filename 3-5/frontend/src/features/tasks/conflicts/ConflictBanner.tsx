'use client';

export function ConflictBanner(props: { message?: string; onReload: () => void }) {
    return (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-medium">版本衝突</div>
            <div className="mt-1">{props.message ?? '資料已被其他人更新，請重新載入最新內容後再試。'}</div>
            <div className="mt-2">
                <button type="button" className="rounded bg-amber-900 px-3 py-1.5 text-xs font-medium text-white" onClick={props.onReload}>
                    重新載入
                </button>
            </div>
        </div>
    );
}
