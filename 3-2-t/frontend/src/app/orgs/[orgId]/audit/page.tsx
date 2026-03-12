'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { listOrganizationAudit } from '@/services/audit/audit-api';

function OrganizationAuditPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = String(params.orgId);
  const searchParams = useSearchParams();
  const action = searchParams.get('action') ?? undefined;

  const auditQuery = useQuery({
    queryKey: ['org-audit', orgId, action],
    queryFn: () => listOrganizationAudit(orgId, { action }),
  });

  if (auditQuery.isLoading) {
    return <LoadingPageState title="Loading organization audit..." message="Querying immutable organization audit entries." />;
  }

  if (auditQuery.isError || !auditQuery.data) {
    return <ErrorPageState title="Unable to load organization audit." message="Audit history could not be retrieved for this organization." />;
  }

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Audit traceability</p>
        <h2>Organization audit log</h2>
      </div>
      <section className="panel stack">
        {auditQuery.data.map((entry) => (
          <article className="timeline-card" key={entry.auditLogId}>
            <div className="meta-row">
              <strong>{entry.action}</strong>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <p>
              {entry.actorEmail} · {entry.entityType}
            </p>
          </article>
        ))}
      </section>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingPageState title="Loading organization audit..." message="Preparing the audit page." />}>
      <OrganizationAuditPage />
    </Suspense>
  );
}
