'use client';

export function ArchivedBadge(props: { className?: string }) {
    return (
        <span className={props.className ?? 'inline-flex items-center rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-800'}>
            Archived
        </span>
    );
}
