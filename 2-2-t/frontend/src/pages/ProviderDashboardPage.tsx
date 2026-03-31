import { useQuery } from '@tanstack/react-query';

import { apiGetJson, ApiError } from '../api/http';
import { ServicesListResponseSchema, ProviderBookingsResponseSchema } from '../api/schemas';
import { ProviderServiceManagePanel } from '../features/provider-service-manage/ProviderServiceManagePanel';
import { ProviderTimeSlotManagePanel } from '../features/provider-timeslot-manage/ProviderTimeSlotManagePanel';
import { ProviderBookingStatusUpdatePanel } from '../features/provider-booking-status-update/ProviderBookingStatusUpdatePanel';

export function ProviderDashboardPage() {
  const servicesQuery = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => apiGetJson('/provider/services', ServicesListResponseSchema),
  });

  const bookingsQuery = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => apiGetJson('/provider/bookings', ProviderBookingsResponseSchema),
  });

  if (servicesQuery.isLoading || bookingsQuery.isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (servicesQuery.isError || bookingsQuery.isError) {
    const error = (servicesQuery.error ?? bookingsQuery.error) as unknown;
    const msg =
      error instanceof ApiError
        ? error.status === 401
          ? 'Session expired. Please login again.'
          : error.message
        : 'Error loading provider dashboard.';

    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Provider dashboard</h1>
        <p className="mt-2 text-sm text-red-700">{msg}</p>
        <button
          type="button"
          className="mt-4 rounded border px-3 py-2 text-sm"
          onClick={() => {
            void Promise.all([servicesQuery.refetch(), bookingsQuery.refetch()]);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const services = servicesQuery.data?.items ?? [];
  const bookings = bookingsQuery.data?.items ?? [];

  if (services.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Provider dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">No services yet.</p>
        <div className="mt-6">
          <ProviderServiceManagePanel />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Provider dashboard</h1>

      <div className="mt-6 space-y-8">
        <section className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold">Services</h2>
          <div className="mt-3">
            <ProviderServiceManagePanel />
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold">Time slots</h2>
          <div className="mt-3">
            <ProviderTimeSlotManagePanel services={services} />
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold">Bookings</h2>
          <div className="mt-3">
            <ProviderBookingStatusUpdatePanel bookings={bookings} />
          </div>
        </section>
      </div>
    </div>
  );
}
