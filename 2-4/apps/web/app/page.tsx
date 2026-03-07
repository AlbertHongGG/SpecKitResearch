import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Dynamic Survey</h1>
      <p className="mt-2 text-zinc-700">Choose a flow to start.</p>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Admin</h2>
          <p className="mt-1 text-sm text-zinc-600">Create drafts, edit logic, publish, and view results.</p>
          <div className="mt-4">
            <Link className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" href="/surveys">
              Open surveys
            </Link>
          </div>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Respondent demo</h2>
          <p className="mt-1 text-sm text-zinc-600">Try the public dynamic survey flow.</p>
          <div className="mt-4">
            <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href="/s/demo-survey">
              Open demo survey
            </Link>
          </div>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Login</h2>
          <p className="mt-1 text-sm text-zinc-600">Sign in before entering owner-only pages.</p>
          <div className="mt-4">
            <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href="/login">
              Go to login
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
