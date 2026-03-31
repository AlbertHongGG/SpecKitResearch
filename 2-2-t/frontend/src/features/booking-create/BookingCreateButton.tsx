import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ApiError, apiPostJson } from '../../api/http';
import { BookingSchema } from '../../api/schemas';

export function BookingCreateButton(input: { timeSlotId: string; onCreated?: () => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return apiPostJson('/bookings', { timeSlotId: input.timeSlotId }, BookingSchema);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['service'] }),
      ]);
      input.onCreated?.();
    },
  });

  const errorMessage = useMemo(() => {
    if (!mutation.error) return null;
    if (mutation.error instanceof ApiError) {
      if (mutation.error.code === 'BOOKING_SEAT_FULL') return '名額已滿或時段不可用。';
      if (mutation.error.code === 'BOOKING_DUPLICATE') return '你已預約此時段。';
      return mutation.error.message;
    }
    return '預約失敗。';
  }, [mutation.error]);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-60"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? '預約中…' : '立即預約'}
      </button>

      {mutation.isSuccess ? <div className="text-xs text-green-700">已預約</div> : null}
      {errorMessage ? <div className="text-xs text-red-700">{errorMessage}</div> : null}
    </div>
  );
}
