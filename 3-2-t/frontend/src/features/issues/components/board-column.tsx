'use client';

import type { IssueRecord } from '@/services/issues/issues-api';

interface BoardColumnProps {
  title: string;
  issues: IssueRecord[];
  nextStatus?: { key: string; name: string } | null;
  onMove: (issue: IssueRecord, nextStatusKey: string) => Promise<void> | void;
}

export function BoardColumn({ title, issues, nextStatus, onMove }: BoardColumnProps) {
  return (
    <section className="status-column" aria-label={`${title} column`}>
      <header className="column-header">
        <h3>{title}</h3>
        <span>{issues.length}</span>
      </header>
      <div className="stack compact-stack">
        {issues.map((issue) => (
          <article className="issue-card" key={issue.id}>
            <div className="meta-row">
              <strong>{issue.issueKey}</strong>
              <span className="pill">{issue.priority}</span>
            </div>
            <p>{issue.title}</p>
            {issue.sprint ? <small>In {issue.sprint.name}</small> : <small>Backlog</small>}
            <div className="actions">
              <a className="button-secondary" href={`/projects/${issue.projectId}/issues/${issue.issueKey}`}>
                Details
              </a>
              {nextStatus ? (
                <button className="button" type="button" onClick={() => onMove(issue, nextStatus.key)}>
                  {`Move ${issue.issueKey} to ${nextStatus.name}`}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
