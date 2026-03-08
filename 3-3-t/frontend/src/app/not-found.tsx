import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-page space-y-3">
      <h1 className="text-2xl font-semibold">404 Not Found</h1>
      <Link className="rounded border px-3 py-1" href="/pricing">Go Pricing</Link>
    </main>
  );
}
