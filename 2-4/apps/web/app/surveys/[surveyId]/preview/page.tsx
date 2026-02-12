'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { computeVisibleQuestions } from '@acme/logic-engine';
import type { AnswersByQuestionId, SurveySnapshot } from '@acme/logic-engine';

import { getSurveyDetail } from '../../../../src/features/adminDraft/api';
import { EmptyState } from '../../../../src/components/EmptyState';

function isVisible(visibleIds: string[], id: string) {
  return visibleIds.includes(id);
}

export default function SurveyPreviewPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = params.surveyId;

  const detailQuery = useQuery({
    queryKey: ['surveys', surveyId, 'detail'],
    queryFn: () => getSurveyDetail(surveyId),
  });

  const [answers, setAnswers] = useState<AnswersByQuestionId>({});

  const snapshot = useMemo<SurveySnapshot | null>(() => {
    const data = detailQuery.data;
    if (!data) return null;

    return {
      survey: {
        id: data.survey.id,
        slug: data.survey.slug,
        title: data.survey.title,
        description: data.survey.description ?? null,
        is_anonymous: data.survey.is_anonymous,
        status: data.survey.status,
      },
      publish_hash: data.survey.publish_hash ?? 'draft',
      questions: data.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          is_required: q.is_required,
          order: q.order,
        })),
      rule_groups: data.rule_groups.map((g) => ({
        id: g.id,
        target_question_id: g.target_question_id,
        action: g.action,
        group_operator: g.group_operator,
        rules: g.rules.map((r) => ({
          id: r.id,
          source_question_id: r.source_question_id,
          operator: r.operator,
          value: r.value,
        })),
      })),
    } satisfies SurveySnapshot;
  }, [detailQuery.data]);

  const optionsByQuestion = useMemo(() => {
    const data = detailQuery.data;
    if (!data) return new Map<string, Array<{ label: string; value: string }>>();
    const map = new Map<string, Array<{ label: string; value: string }>>();
    for (const opt of data.options) {
      const arr = map.get(opt.question_id) ?? [];
      arr.push({ label: opt.label, value: opt.value });
      map.set(opt.question_id, arr);
    }
    return map;
  }, [detailQuery.data]);

  const visibility = useMemo(() => {
    if (!snapshot) return null;
    return computeVisibleQuestions(snapshot, answers);
  }, [snapshot, answers]);

  useEffect(() => {
    if (!visibility) return;
    const hidden = new Set(visibility.hidden_question_ids);
    if (hidden.size === 0) return;

    setAnswers((prev) => {
      let changed = false;
      const next: AnswersByQuestionId = { ...prev };
      for (const id of Object.keys(next)) {
        if (hidden.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibility]);

  if (detailQuery.isLoading)
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState title="Loading preview…" />
      </main>
    );
  if (detailQuery.error || !snapshot || !visibility) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState
          title="Preview unavailable"
          description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load'}
        />
      </main>
    );
  }

  const visibleQuestions = snapshot.questions.filter((q) => isVisible(visibility.visible_question_ids, q.id));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Preview</h1>
          <p className="mt-1 text-sm text-zinc-600">{snapshot.survey.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href="/surveys">
            Back
          </Link>
          <Link
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
            href={`/surveys/${surveyId}/edit`}
          >
            Edit
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Visible questions</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Visibility computed in-browser using the shared engine; hidden answers are not submitted.
        </p>

        {visibleQuestions.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No visible questions" description="Check rule groups or add questions." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {visibleQuestions.map((q) => {
              const opts = optionsByQuestion.get(q.id) ?? [];
              const value = answers[q.id];

              return (
                <div key={q.id} className="rounded-md border border-zinc-200 p-3">
                  <div className="text-xs text-zinc-500">Q{q.order} • {q.type}{q.is_required ? ' • required' : ''}</div>
                  <div className="mt-1 text-sm font-medium">{q.title}</div>

                  {q.type === 'Text' ? (
                    <textarea
                      className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      rows={3}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  ) : q.type === 'Number' ? (
                    <input
                      className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      type="number"
                      value={typeof value === 'number' ? value : ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    />
                  ) : q.type === 'Rating' ? (
                    <input
                      className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      max={5}
                      value={typeof value === 'number' ? value : ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    />
                  ) : q.type === 'SingleChoice' ? (
                    <div className="mt-2 space-y-2">
                      {opts.map((o) => (
                        <label key={o.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={q.id}
                            value={o.value}
                            checked={value === o.value}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.value }))}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'MultipleChoice' ? (
                    <div className="mt-2 space-y-2">
                      {opts.map((o) => {
                        const arr = Array.isArray(value) ? value : [];
                        const checked = arr.includes(o.value);
                        return (
                          <label key={o.value} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(arr);
                                if (e.target.checked) next.add(o.value);
                                else next.delete(o.value);
                                setAnswers((prev) => ({ ...prev, [q.id]: Array.from(next) }));
                              }}
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-zinc-600">Preview not implemented for this type.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
            onClick={() => setAnswers({})}
          >
            Reset answers
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Debug</h2>
        <div className="mt-2 grid gap-2 text-xs text-zinc-700">
          <div>Visible: {visibility.visible_question_ids.length}</div>
          <div>Hidden: {visibility.hidden_question_ids.length}</div>
        </div>
      </section>
    </main>
  );
}
