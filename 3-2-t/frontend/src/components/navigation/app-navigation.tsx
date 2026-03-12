'use client';

import Link from 'next/link';

import { resolveCapabilityMap } from '@/lib/auth/capability-map';
import { useSession, type SessionState } from '@/lib/auth/session-context';
import { logout } from '@/services/auth/auth-api';

export interface NavigationLink {
  href: '/orgs' | '/platform/orgs' | '/platform/audit';
  label: string;
}

export function buildNavigationLinks(session: SessionState): NavigationLink[] {
  const capabilities = resolveCapabilityMap(session);
  const links: NavigationLink[] = [];

  if (session.authenticated) {
    links.push({ href: '/orgs', label: 'Organizations' });
  }

  if (capabilities.canViewPlatformAdmin) {
    links.push({ href: '/platform/orgs', label: 'Platform Admin' });
    links.push({ href: '/platform/audit', label: 'Platform Audit' });
  }

  return links;
}

export function AppNavigation() {
  const session = useSession();
  const links = buildNavigationLinks(session);

  return (
    <nav className="nav-shell" aria-label="Application navigation">
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.href} className="nav-link" href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
      {session.authenticated ? (
        <button
          className="button button-secondary"
          type="button"
          onClick={async () => {
            await logout(session.csrfToken);
            await session.refresh();
            window.location.href = '/login';
          }}
        >
          Sign out
        </button>
      ) : null}
    </nav>
  );
}
