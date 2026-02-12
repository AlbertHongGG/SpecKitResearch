'use client';

import type { DraftOptionInput, DraftQuestionInput } from './saveDraft';

function newId(): string {
  return crypto.randomUUID();
}

export function OptionEditor(props: {
  question: DraftQuestionInput | null;
  options: DraftOptionInput[];
  onChange: (next: DraftOptionInput[]) => void;
}) {
  const q = props.question;

  if (!q) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Options</h2>
        <p className="mt-3 text-sm text-zinc-600">Select a question to edit its options.</p>
      </section>
    );
  }

  const supportsOptions = q.type === 'SingleChoice' || q.type === 'MultipleChoice' || q.type === 'Matrix';
  const optionsForQ = props.options.filter((o) => o.question_id === q.id);

  function setOption(id: string, patch: Partial<DraftOptionInput>) {
    props.onChange(props.options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addOption() {
    if (!q) return;
    const idx = optionsForQ.length + 1;
    const unique = crypto.randomUUID().slice(0, 8);
    props.onChange([
      ...props.options,
      {
        id: newId(),
        question_id: q.id,
        label: `Option ${idx}`,
        value: `opt_${unique}`,
      },
    ]);
  }

  function removeOption(id: string) {
    props.onChange(props.options.filter((o) => o.id !== id));
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Options</h2>
          <p className="mt-0.5 text-xs text-zinc-600">For: {q.title || '(untitled)'}</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={addOption}
          disabled={!supportsOptions}
        >
          Add option
        </button>
      </div>

      {!supportsOptions ? (
        <p className="mt-3 text-sm text-zinc-600">This question type does not use options.</p>
      ) : optionsForQ.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No options yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {optionsForQ.map((o) => (
            <div key={o.id} className="grid gap-2 md:grid-cols-5">
              <label className="md:col-span-2">
                <div className="mb-1 text-xs text-zinc-700">Label</div>
                <input
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={o.label}
                  onChange={(e) => setOption(o.id, { label: e.target.value })}
                />
              </label>

              <label className="md:col-span-2">
                <div className="mb-1 text-xs text-zinc-700">Value</div>
                <input
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={o.value}
                  onChange={(e) => setOption(o.id, { value: e.target.value })}
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-700"
                  onClick={() => removeOption(o.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
