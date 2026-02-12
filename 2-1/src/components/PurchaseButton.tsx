'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { FetchJsonError } from '@/lib/http/fetchJson';
import { queryKeys } from '@/lib/queryKeys';
import { authClient } from '@/services/authClient';
import { coursesClient } from '@/services/coursesClient';

export default function PurchaseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: queryKeys.me(), queryFn: authClient.me });

  const mutation = useMutation({
    mutationFn: () => coursesClient.purchase(courseId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.myCourses() });
      router.push(`/my-courses/${courseId}`);
    },
  });

  const disabled = mutation.isPending;

  return (
    <button
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      disabled={disabled}
      onClick={async () => {
        if (!me?.user) {
          router.push('/login');
          return;
        }

        try {
          await mutation.mutateAsync();
        } catch (e) {
          if (e instanceof FetchJsonError && e.status === 409) {
            router.push(`/my-courses/${courseId}`);
            return;
          }
          throw e;
        }
      }}
    >
      {mutation.isPending ? '處理中…' : '購買並開始學習'}
    </button>
  );
}
