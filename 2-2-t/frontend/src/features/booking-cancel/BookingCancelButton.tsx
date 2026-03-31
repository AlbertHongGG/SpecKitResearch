import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ApiError, apiPostNoContent } from '../../api/http';

export function BookingCancelButton(input: { bookingId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiPostNoContent(`/bookings/${input.bookingId}/cancel`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const errorMessage = useMemo(() => {
    if (!mutation.error) return null;
    if (mutation.error instanceof ApiError) {
      if (mutation.error.code === 'BOOKING_ALREADY_CANCELLED') return '此預約已取消。';
      if (mutation.error.code === 'BOOKING_NOT_CANCELLABLE') return '已超過取消截止時間。';
      return mutation.error.message;
    }
    return '取消失敗。';
  }, [mutation.error]);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="rounded border px-3 py-1 text-sm disabled:opacity-60"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? '取消中…' : '取消預約'}
      </button>
      {errorMessage ? <div className="text-xs text-red-700">{errorMessage}</div> : null}
    </div>
  );
}
