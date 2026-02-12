import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dynamic Survey Logic</h1>
      <p className="text-gray-700">Admin flows live under /surveys. Public surveys live under /s/:slug.</p>
      <div className="flex gap-2">
        <Link className="rounded border px-3 py-1" href="/login">
          Login
        </Link>
        <Link className="rounded border px-3 py-1" href="/s/demo">
          Open demo survey
        </Link>
      </div>
    </div>
  );
}
