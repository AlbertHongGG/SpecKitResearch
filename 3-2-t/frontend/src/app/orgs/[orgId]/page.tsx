'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { buildOrganizationAdminCtas } from '@/lib/auth/capability-map';
import { useSession } from '@/lib/auth/session-context';
import { getOrganizationOverview } from '@/services/organizations/org-members-api';

export default function Page() {
  const params = useParams<{ orgId: string }>();
  const orgId = String(params.orgId);
  const session = useSession();

  const overviewQuery = useQuery({
    queryKey: ['organization-overview', orgId],
    queryFn: () => getOrganizationOverview(orgId),
    enabled: session.authenticated,
  });

  if (session.loading || overviewQuery.isLoading) {
    return <LoadingPageState title="Loading organization overview..." message="Resolving organization policy and membership context." />;
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <ErrorPageState title="Unable to load organization overview." message="The organization may be hidden or the API is unavailable." />;
  }

  const ctas = buildOrganizationAdminCtas(session, orgId);

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Organization overview</p>
        <h2>{overviewQuery.data.name}</h2>
        <p>
          {overviewQuery.data.plan} plan · {overviewQuery.data.status} · signed in as {overviewQuery.data.myRole}
        </p>
      </div>

      <div className="dashboard-grid">
        <section className="panel stack">
          <h3>Governance summary</h3>
          <div className="card-row">
            <div>
              <h3>Plan and enforcement</h3>
              <p>{overviewQuery.data.plan} subscription with {overviewQuery.data.status} lifecycle state.</p>
            </div>
            <span className="pill">{overviewQuery.data.myRole}</span>
          </div>
        </section>

        <section className="panel stack">
          <h3>Admin actions</h3>
          {ctas.length ? (
            <div className="actions">
              {ctas.map((action) => (
                <a key={action.href} className="button button-secondary" href={action.href}>
                  {action.label}
                </a>
              ))}
            </div>
          ) : (
            <p>Project contributors can view organization context here without elevated administration controls.</p>
          )}
        </section>
      </div>
    </section>
  );
}
