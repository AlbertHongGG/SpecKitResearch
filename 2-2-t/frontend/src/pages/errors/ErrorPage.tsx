import { Link } from 'react-router-dom';

export function ErrorPage({ kind }: { kind: '401' | '403' | '404' | '500' }) {
  const title =
    kind === '401'
      ? 'Unauthorized'
      : kind === '403'
        ? 'Forbidden'
        : kind === '404'
          ? 'Not Found'
          : 'Error';

  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">({kind})</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="underline" to="/">
          Go home
        </Link>
        {kind === '401' ? (
          <Link className="underline" to="/login">
            Go to login
          </Link>
        ) : null}
      </div>
    </div>
  );
}
