'use client';

import type { Question, QuestionType } from '@app/contracts';
import { newId } from './state';
import { OptionsEditor } from './OptionsEditor';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'SC', label: 'Single choice' },
  { value: 'MC', label: 'Multiple choice' },
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'RATING', label: 'Rating' },
  { value: 'MATRIX', label: 'Matrix' }
];

function needsOptions(t: QuestionType) {
  return t === 'SC' || t === 'MC' || t === 'MATRIX';
}

export function QuestionEditor({
  questions,
  onChange
}: {
  questions: Question[];
  onChange: (next: Question[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Questions</div>
        <button
          className="rounded border px-2 py-1 text-sm"
          type="button"
          onClick={() =>
            onChange([
              ...questions,
              {
                id: newId('q'),
                title: 'New question',
                type: 'TEXT',
                required: false
              }
            ])
          }
        >
          Add question
        </button>
      </div>

      {questions.length === 0 ? <div className="text-sm text-gray-600">No questions yet.</div> : null}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded border bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Q{idx + 1}</div>
              <div className="flex gap-2">
                <button
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  type="button"
                  disabled={idx === 0}
                  onClick={() => {
                    if (idx === 0) return;
                    const next = questions.slice();
                    const tmp = next[idx - 1];
                    next[idx - 1] = next[idx];
                    next[idx] = tmp;
                    onChange(next);
                  }}
                >
                  Up
                </button>
                <button
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  type="button"
                  disabled={idx === questions.length - 1}
                  onClick={() => {
                    if (idx === questions.length - 1) return;
                    const next = questions.slice();
                    const tmp = next[idx + 1];
                    next[idx + 1] = next[idx];
                    next[idx] = tmp;
                    onChange(next);
                  }}
                >
                  Down
                </button>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  type="button"
                  onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={q.title}
                  onChange={(e) => {
                    const next = questions.slice();
                    next[idx] = { ...q, title: e.target.value };
                    onChange(next);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Description (optional)</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={q.description ?? ''}
                  onChange={(e) => {
                    const next = questions.slice();
                    next[idx] = { ...q, description: e.target.value || undefined };
                    onChange(next);
                  }}
                />
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6 space-y-1">
                  <label className="text-xs text-gray-600">Type</label>
                  <select
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={q.type}
                    onChange={(e) => {
                      const nextType = e.target.value as QuestionType;
                      const next = questions.slice();
                      const nextQ: Question = {
                        ...q,
                        type: nextType,
                        options: needsOptions(nextType) ? q.options ?? [] : undefined
                      };
                      next[idx] = nextQ;
                      onChange(next);
                    }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="col-span-6 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => {
                      const next = questions.slice();
                      next[idx] = { ...q, required: e.target.checked };
                      onChange(next);
                    }}
                  />
                  Required
                </label>
              </div>

              {needsOptions(q.type) ? (
                <OptionsEditor
                  options={q.options ?? []}
                  onChange={(opts) => {
                    const next = questions.slice();
                    next[idx] = { ...q, options: opts };
                    onChange(next);
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
