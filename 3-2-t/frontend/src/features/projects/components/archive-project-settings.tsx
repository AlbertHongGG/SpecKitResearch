'use client';

import { useState } from 'react';

import { ReadOnlyBanner } from '@/components/state/read-only-banner';
import { archiveProject, type OrganizationProjectSummary } from '@/services/projects/project-admin-api';

interface ArchiveProjectSettingsProps {
  project: OrganizationProjectSummary;
  csrfToken?: string | null;
  onArchived: () => Promise<void>;
}

export function ArchiveProjectSettings({ project, csrfToken, onArchived }: ArchiveProjectSettingsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archived = project.status === 'archived';

  return (
    <section className="panel-soft stack">
      <div className="column-header">
        <div>
          <h3>Archive project</h3>
          <p>Archiving is irreversible and blocks all further writes.</p>
        </div>
        <span className="pill">{project.status}</span>
      </div>
      {archived ? <ReadOnlyBanner title="Project archived" message="Issue updates, transitions, comments, and role changes are disabled for this project." /> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={busy || archived}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await archiveProject(project.projectId, csrfToken);
              await onArchived();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Unable to archive project.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {archived ? 'Archived' : busy ? 'Archiving...' : 'Archive project'}
        </button>
      </div>
    </section>
  );
}
