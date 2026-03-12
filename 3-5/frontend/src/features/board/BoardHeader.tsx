'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Board } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { useToast } from '../../components/Toast';

export function BoardHeader(props: {
    projectId: string;
    boards: Board[];
    activeBoardId: string | null;
    onSelectBoardId: (boardId: string) => void;
    canManageBoards: boolean;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');

    const active = useMemo(
        () => (props.activeBoardId ? props.boards.find((b) => b.id === props.activeBoardId) : null),
        [props.activeBoardId, props.boards],
    );

    const createMutation = useMutation({
        mutationFn: async () => api.createBoard(props.projectId, { name: name.trim() }),
        onSuccess: async (board) => {
            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
            toast.push('已建立看板', 'success');
            setName('');
            setCreating(false);
            props.onSelectBoardId(board.id);
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '建立看板失敗', 'error'),
    });

    return (
        <div className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm text-slate-600">看板</div>
                    <div className="mt-1 text-lg font-semibold">{active ? active.name : props.boards.length ? '選擇看板' : '尚無看板'}</div>
                </div>

                {props.canManageBoards ? (
                    <div>
                        {!creating ? (
                            <button
                                type="button"
                                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                                onClick={() => setCreating(true)}
                            >
                                建立看板
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {props.boards.map((b) => (
                    <button
                        key={b.id}
                        type="button"
                        onClick={() => props.onSelectBoardId(b.id)}
                        className={`rounded px-3 py-1.5 text-sm ${b.id === props.activeBoardId ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                            }`}
                    >
                        {b.name}
                    </button>
                ))}
            </div>

            {props.canManageBoards && creating ? (
                <div className="mt-4 rounded border bg-slate-50 p-3">
                    <div className="text-sm font-medium">新看板</div>
                    <div className="mt-2 flex gap-2">
                        <input
                            className="w-full rounded border px-3 py-2 text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如：產品 Roadmap"
                        />
                        <button
                            type="button"
                            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                            disabled={!name.trim() || createMutation.isPending}
                            onClick={() => createMutation.mutate()}
                        >
                            {createMutation.isPending ? '建立中…' : '建立'}
                        </button>
                        <button
                            type="button"
                            className="rounded border px-3 py-2 text-sm"
                            onClick={() => {
                                setCreating(false);
                                setName('');
                            }}
                        >
                            取消
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
