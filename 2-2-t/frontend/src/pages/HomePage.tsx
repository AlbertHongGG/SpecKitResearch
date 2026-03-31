import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-2xl font-semibold">SmartBooking</h1>
      <p className="mt-2 text-sm text-gray-600">Browse services and book timeslots.</p>
      <div className="mt-4">
        <Link className="rounded bg-black px-3 py-2 text-white" to="/services">
          View services
        </Link>
      </div>
    </div>
  );
}
