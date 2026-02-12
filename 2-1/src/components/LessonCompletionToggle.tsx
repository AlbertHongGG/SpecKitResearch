'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { progressClient } from '@/services/progressClient';

export default function LessonCompletionToggle(props: { courseId: string; lessonId: string; isCompleted: boolean }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (next: boolean) => progressClient.setCompletion(props.lessonId, next),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.myCourses() }),
        qc.invalidateQueries({ queryKey: queryKeys.reader(props.courseId) }),
      ]);
    },
  });

  return (
    <button
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!props.isCompleted)}
    >
      {mutation.isPending ? '更新中…' : props.isCompleted ? '標記為未完成' : '標記為完成'}
    </button>
  );
}
