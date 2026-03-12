import type { IssueTimelineEntry } from '@/services/issues/issues-api';

interface IssueTimelineProps {
  entries: IssueTimelineEntry[];
}

function renderPayload(payload: string | null) {
  if (!payload) {
    return 'No payload';
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return payload;
  }
}

export function IssueTimeline({ entries }: IssueTimelineProps) {
  return (
    <section className="panel stack">
      <h3>Issue timeline</h3>
      {entries.length === 0 ? <p>No timeline entries yet.</p> : null}
      {entries.map((entry) => (
        <article className="timeline-card" key={entry.id}>
          <div className="meta-row">
            <strong>{entry.action}</strong>
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
          <p>
            {entry.actorEmail} · {entry.entityType}
          </p>
          <details>
            <summary>Inspect payload</summary>
            <pre>{renderPayload(entry.afterJson ?? entry.beforeJson)}</pre>
          </details>
        </article>
      ))}
    </section>
  );
}
