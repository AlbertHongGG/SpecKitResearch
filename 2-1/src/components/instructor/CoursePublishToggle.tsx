'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';

export function CoursePublishToggle({ courseId, status }: { courseId: string; status: string }) {
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      if (status === 'published') return instructorClient.setPublishStatus(courseId, 'archived');
      if (status === 'archived') return instructorClient.setPublishStatus(courseId, 'published');
      throw new Error('目前狀態不可上下架');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.instructorCourses() });
      await qc.invalidateQueries({ queryKey: queryKeys.instructorCourse(courseId) });
    },
  });

  const label = status === 'published' ? '下架' : status === 'archived' ? '上架' : '上下架';

  return (
    <Button
      type="button"
      className="bg-slate-700 hover:bg-slate-600"
      disabled={m.isPending || !['published', 'archived'].includes(status)}
      onClick={() => m.mutate()}
    >
      {m.isPending ? '處理中…' : label}
    </Button>
  );
}
