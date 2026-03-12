'use client';

import { Modal } from '../../components/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Task } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { TaskEditor } from './TaskEditor';
import { CommentsPanel } from '../comments/CommentsPanel';

export function TaskDrawer(props: {
    projectId: string;
    taskId: string | null;
    canWrite: boolean;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();

    const taskQuery = useQuery({
        queryKey: ['task', props.taskId],
        queryFn: () => api.getTask(props.taskId!),
        enabled: !!props.taskId,
    });

    if (!props.taskId) return null;

    const task: Task | null = taskQuery.data ?? null;

    return (
        <Modal open={!!props.taskId} title="任務" onClose={props.onClose} variant="drawer" maxWidthClassName="max-w-lg">
            {taskQuery.isLoading ? (
                <div className="text-sm text-slate-600">載入中…</div>
            ) : taskQuery.error ? (
                <div className="text-sm text-red-600">載入失敗</div>
            ) : task ? (
                <div className="space-y-4">
                    {props.canWrite ? (
                        <TaskEditor
                            projectId={props.projectId}
                            task={task}
                            onUpdated={(updated) => {
                                queryClient.setQueryData(['task', props.taskId], updated);
                            }}
                        />
                    ) : (
                        <div className="rounded border bg-slate-50 p-3 text-sm text-slate-700">
                            唯讀：你沒有修改任務的權限。
                        </div>
                    )}

                    <CommentsPanel projectId={props.projectId} taskId={task.id} canWrite={props.canWrite} />
                </div>
            ) : (
                <div className="text-sm text-slate-600">找不到任務</div>
            )}
        </Modal>
    );
}
