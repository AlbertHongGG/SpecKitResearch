'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { listPlatformAudit } from '@/services/audit/audit-api';

function PlatformAuditPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action') ?? undefined;

  const auditQuery = useQuery({
    queryKey: ['platform-audit', action],
    queryFn: () => listPlatformAudit({ action }),
  });

  if (auditQuery.isLoading) {
    return <LoadingPageState title="Loading platform audit..." message="Querying cross-tenant administrative audit entries." />;
  }

  if (auditQuery.isError || !auditQuery.data) {
    return <ErrorPageState title="Unable to load platform audit." message="Platform-level audit history is unavailable." />;
  }

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Platform traceability</p>
        <h2>Platform audit stream</h2>
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
    <Suspense fallback={<LoadingPageState title="Loading platform audit..." message="Preparing the audit page." />}>
      <PlatformAuditPage />
    </Suspense>
  );
}
