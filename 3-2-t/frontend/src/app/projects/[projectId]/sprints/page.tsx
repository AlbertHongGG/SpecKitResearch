'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { useSession } from '@/lib/auth/session-context';
import { closeSprint, createSprint, listSprints, startSprint } from '@/services/sprints/sprints-api';

export default function Page() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const session = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const sprintsQuery = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => listSprints(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => createSprint(projectId, { name, goal }, session.csrfToken),
    onSuccess: async () => {
      setName('');
      setGoal('');
      await queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });
  const startMutation = useMutation({
    mutationFn: (sprintId: string) => startSprint(projectId, sprintId, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });
  const closeMutation = useMutation({
    mutationFn: (sprintId: string) => closeSprint(projectId, sprintId, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });

  if (sprintsQuery.isLoading || session.loading) {
    return <main className="panel">Loading sprints...</main>;
  }

  if (sprintsQuery.isError || !sprintsQuery.data) {
    return <main className="panel">Unable to load sprints.</main>;
  }

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Sprint planning</p>
        <h2>Sprints</h2>
      </div>

      <section className="panel stack">
        <h3>Create sprint</h3>
        <label className="field">
          <span>Sprint name</span>
          <input aria-label="Sprint name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Sprint goal</span>
          <input aria-label="Sprint goal" value={goal} onChange={(event) => setGoal(event.target.value)} />
        </label>
        <button className="button" type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || name.trim().length === 0}>
          {createMutation.isPending ? 'Creating sprint...' : 'Create sprint'}
        </button>
      </section>

      <section className="stack">
        {sprintsQuery.data.map((sprint) => (
          <article className="panel" key={sprint.id}>
            <div className="meta-row">
              <div>
                <h3>{sprint.name}</h3>
                <p>{sprint.goal ?? 'No sprint goal set.'}</p>
              </div>
              <span className="pill">{sprint.status}</span>
            </div>
            <div className="actions">
              {sprint.status === 'planned' ? (
                <button className="button" type="button" onClick={() => startMutation.mutate(sprint.id)}>
                  {`Start ${sprint.name}`}
                </button>
              ) : null}
              {sprint.status === 'active' ? (
                <button className="button-secondary" type="button" onClick={() => closeMutation.mutate(sprint.id)}>
                  {`Close ${sprint.name}`}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
