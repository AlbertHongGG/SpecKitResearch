'use client';

import { useEffect, useState } from 'react';

import type { WorkflowMutationPayload, WorkflowRecord } from '@/services/workflows/workflows-api';

interface WorkflowEditorProps {
  workflow: WorkflowRecord;
  busy?: boolean;
  onSubmit: (value: WorkflowMutationPayload) => Promise<void> | void;
}

export function WorkflowEditor({ workflow, busy = false, onSubmit }: WorkflowEditorProps) {
  const [name, setName] = useState(workflow.name);
  const [statuses, setStatuses] = useState(workflow.statuses.map((status) => status.name).join(', '));

  useEffect(() => {
    setName(workflow.name);
    setStatuses(workflow.statuses.map((status) => status.name).join(', '));
  }, [workflow]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextStatuses = statuses
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      statuses: nextStatuses.map((status) => ({
        key: status.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        name: status,
      })),
      transitions: nextStatuses.slice(0, -1).map((status, index) => ({
        from: status.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        to: nextStatuses[index + 1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      })),
    };

    await onSubmit(payload);
  }

  return (
    <form className="stack panel-soft" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Workflow editor</p>
        <h3>Version {workflow.version}</h3>
      </div>
      <label className="field">
        <span>Workflow name</span>
        <input aria-label="Workflow name" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Status sequence</span>
        <input aria-label="Status sequence" value={statuses} onChange={(event) => setStatuses(event.target.value)} placeholder="To Do, In Progress, Done" />
      </label>
      <button className="button-secondary" type="submit" disabled={busy}>
        {busy ? 'Updating workflow...' : 'Update workflow'}
      </button>
    </form>
  );
}
