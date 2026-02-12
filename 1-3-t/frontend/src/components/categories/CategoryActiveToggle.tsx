import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Category } from '../../services/categories';
import { setCategoryActive } from '../../services/categories';
import { toUserFacingMessage } from '../../services/apiErrors';
import { useToast } from '../ToastProvider';

export function CategoryActiveToggle(props: {
  category: Category;
  queryKey: readonly unknown[];
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: setCategoryActive,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: props.queryKey });
      const previous = qc.getQueryData<{ items: Category[] }>(props.queryKey);

      qc.setQueryData<{ items: Category[] }>(props.queryKey, (current) => {
        if (!current) return current;
        return {
          items: current.items.map((c) => (c.id === vars.categoryId ? { ...c, isActive: vars.isActive } : c)),
        };
      });

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(props.queryKey, context.previous);
      }

      const msg = toUserFacingMessage(error);
      if (msg) toast.push({ type: 'error', message: msg });
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: props.queryKey });
    },
  });

  const checked = props.category.isActive;

  return (
    <button
      type="button"
      className={`rounded border px-3 py-1.5 text-xs ${
        checked
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border-slate-300 bg-slate-50 text-slate-700'
      } disabled:opacity-60`}
      onClick={() =>
        mutation.mutate({
          categoryId: props.category.id,
          isActive: !checked,
        })
      }
      disabled={mutation.isPending}
      aria-pressed={checked}
    >
      {checked ? '啟用中' : '已停用'}
    </button>
  );
}
