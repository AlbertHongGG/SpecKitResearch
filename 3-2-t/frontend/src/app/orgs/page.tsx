'use client';

import { useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/session-context';
import { listOrganizations, switchOrganization, type OrganizationSummary } from '@/services/auth/auth-api';

export default function Page() {
  const session = useSession();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await listOrganizations();
        setOrganizations(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load organizations.');
      }
    }

    if (session.authenticated) {
      void load();
    }
  }, [session.authenticated]);

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Organization switch</p>
        <h2>Your organizations</h2>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="stack">
        {organizations.map((organization) => (
          <article key={organization.organizationId} className="card-row">
            <div>
              <h3>{organization.name}</h3>
              <p>
                {organization.role} · {organization.plan} · {organization.status}
              </p>
            </div>
            <button
              className="button button-secondary"
              type="button"
              onClick={async () => {
                await switchOrganization(organization.organizationId, session.csrfToken);
                await session.refresh();
              }}
            >
              {session.activeOrganizationId === organization.organizationId ? 'Active' : 'Switch'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
