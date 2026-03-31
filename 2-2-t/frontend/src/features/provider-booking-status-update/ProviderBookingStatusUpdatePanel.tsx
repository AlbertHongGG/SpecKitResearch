import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ApiError, apiPostJson } from '../../api/http';
import { BookingSchema } from '../../api/schemas';
import type { ProviderBooking } from '../../api/schemas';

function allowedTargets(current: ProviderBooking['status']) {
  if (current === 'PENDING') return ['CONFIRMED', 'CANCELLED'] as const;
  if (current === 'CONFIRMED') return ['COMPLETED', 'CANCELLED'] as const;
  return [] as const;
}

export function ProviderBookingStatusUpdatePanel(input: { bookings: ProviderBooking[] }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: { bookingId: string; targetStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' }) => {
      return apiPostJson(
        `/provider/bookings/${payload.bookingId}/status`,
        { targetStatus: payload.targetStatus },
        BookingSchema,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const errorMessage = useMemo(() => {
    if (!mutation.error) return null;
    if (mutation.error instanceof ApiError) {
      if (mutation.error.code === 'BOOKING_STATE_INVALID_TRANSITION')
        return 'Invalid status transition.';
      return mutation.error.message;
    }
    return 'Update failed.';
  }, [mutation.error]);

  if (input.bookings.length === 0) {
    return <div className="text-sm text-gray-600">No bookings yet.</div>;
  }

  return (
    <div className="space-y-3">
      {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
      <ul className="space-y-3">
        {input.bookings.map((b) => {
          const targets = allowedTargets(b.status);
          return (
            <li key={b.id} className="rounded border bg-white p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {b.serviceName} — {new Date(b.startTime).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    User: {b.userEmail} | Status: {b.status}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    aria-label={`Update status for booking ${b.id}`}
                    disabled={targets.length === 0 || mutation.isPending}
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value as '' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
                      if (!v) return;
                      mutation.mutate({ bookingId: b.id, targetStatus: v });
                      e.currentTarget.value = '';
                    }}
                  >
                    <option value="">Update status…</option>
                    {targets.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
