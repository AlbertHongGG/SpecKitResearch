import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IssueForm } from '@/features/issues/components/issue-form';

afterEach(() => {
  cleanup();
});

describe('IssueForm', () => {
  it('shows a validation error when title is blank', async () => {
    const onSubmit = vi.fn();

    render(<IssueForm submitLabel="Create issue" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    expect(await screen.findByText('Title is required.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized values when the form is valid', async () => {
    const onSubmit = vi.fn();

    render(
      <IssueForm
        submitLabel="Create issue"
        sprintOptions={[{ id: 'sprint-2', name: 'Sprint 2' }]}
        epicOptions={[{ issueKey: 'ALPHA-1', title: 'Governance epic' }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Issue title'), { target: { value: 'New board card' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Wire a card into the active sprint.' } });
    fireEvent.change(screen.getByLabelText('Labels'), { target: { value: 'ui, board' } });
    fireEvent.change(screen.getByLabelText('Estimate'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Sprint'), { target: { value: 'sprint-2' } });
    fireEvent.change(screen.getByLabelText('Epic'), { target: { value: 'ALPHA-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'task',
      title: 'New board card',
      description: 'Wire a card into the active sprint.',
      priority: 'medium',
      estimate: 3,
      labels: ['ui', 'board'],
      sprintId: 'sprint-2',
      epicIssueKey: 'ALPHA-1',
    });
  });
});
