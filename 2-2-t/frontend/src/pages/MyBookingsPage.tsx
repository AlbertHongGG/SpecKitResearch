import { useQuery } from '@tanstack/react-query';

import { apiGetJson } from '../api/http';
import { MyBookingsResponseSchema } from '../api/schemas';
import { BookingCancelButton } from '../features/booking-cancel/BookingCancelButton';

export function MyBookingsPage() {
  const query = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiGetJson('/bookings', MyBookingsResponseSchema),
  });

  if (query.isLoading) return <div className="p-6">Loading...</div>;
  if (query.isError) return <div className="p-6">Error loading bookings.</div>;

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">My bookings</h1>
        <p className="mt-2 text-sm text-gray-600">No bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">My bookings</h1>
      <p className="mt-2 text-xs text-gray-600">取消需在系統設定的截止時間前完成。</p>

      <ul className="mt-4 space-y-3">
        {items.map((b) => (
          <li key={b.id} className="rounded border bg-white p-4">
            <div className="text-sm font-medium">Status: {b.status}</div>
            <div className="mt-1 text-xs text-gray-600">Booking ID: {b.id}</div>
            <div className="text-xs text-gray-600">TimeSlot ID: {b.timeSlotId}</div>

            {b.status === 'PENDING' || b.status === 'CONFIRMED' ? (
              <div className="mt-3">
                <BookingCancelButton bookingId={b.id} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
