import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSessionOrNull } from '../../services/auth';
import { HeaderAuth } from './header-auth';
import { isAdmin, isInstructor, isStudent } from '../../lib/roles';

export async function Header() {
  const cookie = (await cookies()).toString();

  const session = await getSessionOrNull({ cookie });

  const role = session?.user?.role ?? null;

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          Content Courses
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/courses" className="text-gray-700 hover:text-black">
            課程
          </Link>

          {isStudent(role) ? (
            <Link href="/my-courses" className="text-gray-700 hover:text-black">
              我的課程
            </Link>
          ) : null}

          {isInstructor(role) ? (
            <Link href="/instructor/courses" className="text-gray-700 hover:text-black">
              教師
            </Link>
          ) : null}

          {isAdmin(role) ? (
            <Link href="/admin/reviews" className="text-gray-700 hover:text-black">
              管理
            </Link>
          ) : null}

          {session ? (
            <HeaderAuth user={{ email: session.user.email, role: session.user.role }} />
          ) : (
            <Link href="/login" className="text-gray-700 hover:text-black">
              登入
            </Link>
          )}
        </nav>

        {/* Mobile nav (no client JS; uses <details>) */}
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
            選單
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-2 shadow-lg">
            <Link href="/courses" className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black">
              課程
            </Link>

            {isStudent(role) ? (
              <Link
                href="/my-courses"
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black"
              >
                我的課程
              </Link>
            ) : null}

            {isInstructor(role) ? (
              <Link
                href="/instructor/courses"
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black"
              >
                教師
              </Link>
            ) : null}

            {isAdmin(role) ? (
              <Link
                href="/admin/reviews"
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black"
              >
                管理
              </Link>
            ) : null}

            <div className="mt-2 border-t pt-2">
              {session ? (
                <HeaderAuth user={{ email: session.user.email, role: session.user.role }} />
              ) : (
                <Link
                  href="/login"
                  className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black"
                >
                  登入
                </Link>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
