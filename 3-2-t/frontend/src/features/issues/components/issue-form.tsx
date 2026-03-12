'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const issueSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  estimate: z
    .string()
    .trim()
    .refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0), 'Estimate must be a non-negative integer.'),
  labels: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  type: z.enum(['story', 'task', 'bug', 'epic']),
  sprintId: z.string(),
  epicIssueKey: z.string(),
});

export interface IssueFormValues {
  type: 'story' | 'task' | 'bug' | 'epic';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimate: string;
  labels: string;
  sprintId: string;
  epicIssueKey: string;
}

interface IssueFormProps {
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
  initialValue?: Partial<IssueFormValues>;
  sprintOptions?: Array<{ id: string; name: string }>;
  epicOptions?: Array<{ issueKey: string; title: string }>;
  onSubmit: (value: {
    type: 'story' | 'task' | 'bug' | 'epic';
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimate: number | null;
    labels: string[];
    sprintId: string | null;
    epicIssueKey: string | null;
  }) => Promise<void> | void;
}

const defaultValue: IssueFormValues = {
  type: 'task',
  title: '',
  description: '',
  priority: 'medium',
  estimate: '',
  labels: '',
  sprintId: '',
  epicIssueKey: '',
};

export function IssueForm({ submitLabel, busy = false, disabled = false, initialValue, sprintOptions = [], epicOptions = [], onSubmit }: IssueFormProps) {
  const [value, setValue] = useState<IssueFormValues>({ ...defaultValue, ...initialValue });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue({ ...defaultValue, ...initialValue });
  }, [initialValue]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = issueSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Issue form is invalid.');
      return;
    }

    setError(null);
    await onSubmit({
      type: parsed.data.type,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim() || null,
      priority: parsed.data.priority,
      estimate: parsed.data.estimate === '' ? null : Number(parsed.data.estimate),
      labels: parsed.data.labels
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean),
      sprintId: parsed.data.sprintId || null,
      epicIssueKey: parsed.data.epicIssueKey || null,
    });
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>Issue title</span>
        <input aria-label="Issue title" value={value.title} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, title: event.target.value }))} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea className="textarea" aria-label="Description" value={value.description} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, description: event.target.value }))} />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Issue type</span>
          <select aria-label="Issue type" value={value.type} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, type: event.target.value as IssueFormValues['type'] }))}>
            <option value="task">Task</option>
            <option value="story">Story</option>
            <option value="bug">Bug</option>
            <option value="epic">Epic</option>
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select aria-label="Priority" value={value.priority} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, priority: event.target.value as IssueFormValues['priority'] }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="field">
          <span>Estimate</span>
          <input aria-label="Estimate" value={value.estimate} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, estimate: event.target.value }))} />
        </label>
        <label className="field">
          <span>Labels</span>
          <input aria-label="Labels" value={value.labels} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, labels: event.target.value }))} placeholder="ui, sprint" />
        </label>
        <label className="field">
          <span>Sprint</span>
          <select aria-label="Sprint" value={value.sprintId} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, sprintId: event.target.value }))}>
            <option value="">Backlog</option>
            {sprintOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Epic</span>
          <select aria-label="Epic" value={value.epicIssueKey} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, epicIssueKey: event.target.value }))}>
            <option value="">No epic</option>
            {epicOptions.map((option) => (
              <option key={option.issueKey} value={option.issueKey}>
                {option.issueKey} {option.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="button" type="submit" disabled={busy || disabled}>
        {busy ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
