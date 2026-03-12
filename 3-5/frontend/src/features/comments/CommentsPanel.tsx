'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, type Comment } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { useToast } from '../../components/Toast';

function CommentRow(props: { c: Comment }) {
    return (
        <div className="border-t py-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <div className="font-mono">{props.c.authorId}</div>
                <div>{formatDateTime(props.c.createdAt)}</div>
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{props.c.content}</div>
        </div>
    );
}

export function CommentsPanel(props: { projectId: string; taskId: string; canWrite: boolean }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');

    const query = useQuery({
        queryKey: ['taskComments', props.taskId],
        queryFn: () => api.taskComments(props.taskId),
    });

    const add = useMutation({
        mutationFn: async () => api.addComment(props.taskId, { content: content.trim() }),
        onSuccess: async () => {
            toast.push('已新增留言', 'success');
            setContent('');
            await queryClient.invalidateQueries({ queryKey: ['taskComments', props.taskId] });
            await queryClient.invalidateQueries({ queryKey: ['activity', props.projectId] });
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '新增留言失敗', 'error'),
    });

    const comments = query.data?.comments ?? [];

    return (
        <div className="rounded border bg-white">
            <div className="border-b px-3 py-2">
                <div className="text-sm font-medium">留言</div>
            </div>

            <div className="px-3 py-2">
                {props.canWrite ? (
                    <div>
                        <textarea
                            className="w-full rounded border px-3 py-2 text-sm"
                            rows={3}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="輸入留言…"
                            disabled={add.isPending}
                        />
                        <div className="mt-2 flex justify-end">
                            <button
                                type="button"
                                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                disabled={!content.trim() || add.isPending}
                                onClick={() => add.mutate()}
                            >
                                {add.isPending ? '送出中…' : '送出'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-slate-600">你沒有留言權限（唯讀）。</div>
                )}

                <div className="mt-3">
                    {query.isLoading ? (
                        <div className="text-sm text-slate-600">載入中…</div>
                    ) : query.error ? (
                        <div className="text-sm text-red-600">載入失敗</div>
                    ) : comments.length ? (
                        <div>{comments.map((c) => <CommentRow key={c.id} c={c} />)}</div>
                    ) : (
                        <div className="text-sm text-slate-600">尚無留言。</div>
                    )}
                </div>
            </div>
        </div>
    );
}
