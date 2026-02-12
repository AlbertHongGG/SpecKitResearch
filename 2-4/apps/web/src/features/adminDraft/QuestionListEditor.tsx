'use client';

import { useMemo } from 'react';
import { QuestionTypeSchema } from '@acme/contracts';
import type { z } from 'zod';

import type { DraftQuestionInput } from './saveDraft';

type QuestionType = z.infer<typeof QuestionTypeSchema>;

function newId(): string {
  return crypto.randomUUID();
}

function normalizeOrders(questions: DraftQuestionInput[]) {
  return questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((q, idx) => ({ ...q, order: idx + 1 }));
}

export function QuestionListEditor(props: {
  questions: DraftQuestionInput[];
  selectedQuestionId: string | null;
  onSelectQuestionId: (id: string | null) => void;
  onChange: (next: DraftQuestionInput[]) => void;
}) {
  const questionsSorted = useMemo(() => {
    return props.questions.slice().sort((a, b) => a.order - b.order);
  }, [props.questions]);

  function setAt(id: string, patch: Partial<DraftQuestionInput>) {
    const next = props.questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
    props.onChange(normalizeOrders(next));
  }

  function addQuestion() {
    const next: DraftQuestionInput[] = normalizeOrders([
      ...props.questions,
      {
        id: newId(),
        type: 'Text',
        title: 'New question',
        is_required: false,
        order: props.questions.length + 1,
      },
    ]);
    props.onChange(next);
    props.onSelectQuestionId(next[next.length - 1]?.id ?? null);
  }

  function removeQuestion(id: string) {
    const next = normalizeOrders(props.questions.filter((q) => q.id !== id));
    props.onChange(next);
    if (props.selectedQuestionId === id) {
      props.onSelectQuestionId(next[0]?.id ?? null);
    }
  }

  function move(id: string, dir: -1 | 1) {
    const sorted = normalizeOrders(props.questions);
    const idx = sorted.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const next = sorted.slice();
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;
    props.onChange(normalizeOrders(next));
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Questions</h2>
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white"
          onClick={addQuestion}
        >
          Add question
        </button>
      </div>

      {questionsSorted.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No questions yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {questionsSorted.map((q) => {
            const selected = q.id === props.selectedQuestionId;
            return (
              <div
                key={q.id}
                className={
                  selected
                    ? 'rounded-md border border-zinc-900 bg-zinc-50 p-3'
                    : 'rounded-md border border-zinc-200 bg-white p-3'
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => props.onSelectQuestionId(q.id)}
                  >
                    <div className="text-xs text-zinc-500">Q{q.order}</div>
                    <div className="text-sm font-medium">{q.title || '(untitled)'}</div>
                    <div className="mt-1 text-xs text-zinc-600">{q.type}</div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
                      onClick={() => move(q.id, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
                      onClick={() => move(q.id, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                      onClick={() => removeQuestion(q.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selected ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-xs">
                      <div className="mb-1 text-zinc-700">Title</div>
                      <input
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        value={q.title}
                        onChange={(e) => setAt(q.id, { title: e.target.value })}
                      />
                    </label>

                    <label className="block text-xs">
                      <div className="mb-1 text-zinc-700">Type</div>
                      <select
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        value={q.type}
                        onChange={(e) => setAt(q.id, { type: e.target.value as QuestionType })}
                      >
                        {QuestionTypeSchema.options.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.is_required}
                        onChange={(e) => setAt(q.id, { is_required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
