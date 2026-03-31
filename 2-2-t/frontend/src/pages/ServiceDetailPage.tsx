import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { apiGetJson } from '../api/http';
import { ServiceDetailResponseSchema } from '../api/schemas';
import { useAuth } from '../state/auth.store';
import { BookingCreateButton } from '../features/booking-create/BookingCreateButton';

export function ServiceDetailPage() {
  const params = useParams();
  const auth = useAuth();

  const id = params.id;

  const query = useQuery({
    queryKey: ['service', id],
    enabled: typeof id === 'string' && id.length > 0,
    queryFn: () => apiGetJson(`/services/${id}`, ServiceDetailResponseSchema),
  });

  if (!id) return <div>Missing service id.</div>;
  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error loading service.</div>;

  const data = query.data;
  if (!data) return <div>Service not found.</div>;

  const { service, timeSlots } = data;

  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">{service.name}</h1>
      <p className="mt-2 text-sm text-gray-600">{service.description}</p>

      <h2 className="mt-6 text-sm font-semibold">Open time slots</h2>
      {timeSlots.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">No open time slots.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {timeSlots.map((ts: (typeof timeSlots)[number]) => (
            <li key={ts.id} className="rounded border p-3">
              <div className="text-sm">
                {new Date(ts.startTime).toLocaleString()} - {new Date(ts.endTime).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Remaining: {ts.remaining}</div>

              {auth.user?.role === 'USER' ? (
                <div className="mt-2">
                  <BookingCreateButton timeSlotId={ts.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
