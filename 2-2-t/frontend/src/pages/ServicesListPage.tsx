import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { apiGetJson } from '../api/http';
import { ServicesListResponseSchema } from '../api/schemas';

export function ServicesListPage() {
  const query = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGetJson('/services', ServicesListResponseSchema),
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error loading services.</div>;

  const services = query.data?.items ?? [];

  if (services.length === 0) return <div>No services.</div>;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Services</h1>
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id} className="rounded border bg-white p-4">
            <Link className="font-medium hover:underline" to={`/services/${s.id}`}>
              {s.name}
            </Link>
            <div className="text-sm text-gray-600">{s.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
