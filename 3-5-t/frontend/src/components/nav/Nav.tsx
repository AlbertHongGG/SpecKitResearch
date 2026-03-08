import Link from 'next/link';
import type { Session } from '../../lib/schemas';

export async function Nav({ sessionPromise }: { sessionPromise: Promise<Session | null> }) {
  const session = await sessionPromise;
  const role = session?.user.role;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          API Key Platform
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {session ? (
            <>
              <Link href="/keys">Keys</Link>
              <Link href="/docs">Docs</Link>
              {role === 'admin' ? <Link href="/admin">Admin</Link> : null}
              <span className="text-gray-500">{session.user.email}</span>
              <form action="/logout" method="post">
                <button className="rounded border px-3 py-1">Logout</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
