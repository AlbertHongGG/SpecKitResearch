'use client';

import { useState } from 'react';

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export default function Comments({
  comments,
  readonly,
  onCreate,
}: {
  comments: Comment[];
  readonly: boolean;
  onCreate: (content: string) => void | Promise<void>;
}) {
  const [content, setContent] = useState('');

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">留言</div>

      <div className="mt-2 space-y-2" data-testid="comment-list">
        {comments.length === 0 ? <div className="text-xs text-slate-500">尚無留言</div> : null}
        {comments.map((c) => (
          <div key={c.id} className="rounded-md border border-slate-200 bg-white p-2">
            <div className="text-[11px] text-slate-500">
              {c.authorId} · {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{c.content}</div>
          </div>
        ))}
      </div>

      {readonly ? (
        <div className="mt-2 text-xs text-slate-500">唯讀狀態無法新增留言。</div>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="輸入留言…"
            maxLength={5000}
            data-testid="comment-input"
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
              disabled={content.trim().length === 0}
              onClick={async () => {
                const trimmed = content.trim();
                if (!trimmed) return;
                await onCreate(trimmed);
                setContent('');
              }}
              data-testid="comment-submit"
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
