'use client';

import type { Option, Question } from '@acme/contracts';

function FieldLabel({ id, title, required }: { id: string; title: string; required: boolean }) {
  return (
    <div className="mb-2">
      <div id={id} className="text-base font-medium">
        {title} {required ? <span className="text-red-600">*</span> : null}
      </div>
    </div>
  );
}

export function QuestionRenderer(props: {
  question: Question;
  options: Option[];
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const { question, options } = props;
  const controlId = `${question.id}-control`;
  const labelId = `${question.id}-label`;
  const errorId = `${question.id}-error`;
  const describedBy = props.error ? errorId : undefined;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <FieldLabel id={labelId} title={question.title} required={question.is_required} />

      {question.type === 'SingleChoice' ? (
        <fieldset
          aria-labelledby={labelId}
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy}
        >
          <legend className="sr-only">Choices</legend>
          <div className="space-y-2">
            {options
              .filter((o) => o.question_id === question.id)
              .map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={question.id}
                    value={o.value}
                    checked={props.value === o.value}
                    onChange={() => props.onChange(o.value)}
                    aria-required={question.is_required}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
          </div>
        </fieldset>
      ) : question.type === 'Text' ? (
        <input
          id={controlId}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={typeof props.value === 'string' ? props.value : ''}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="Type your answer"
          aria-required={question.is_required}
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy}
          aria-labelledby={labelId}
        />
      ) : question.type === 'Rating' ? (
        <select
          id={controlId}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={typeof props.value === 'number' ? String(props.value) : ''}
          onChange={(e) => props.onChange(e.target.value ? Number(e.target.value) : undefined)}
          aria-required={question.is_required}
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy}
          aria-labelledby={labelId}
        >
          <option value="">Select…</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-sm text-zinc-600">Unsupported question type: {question.type}</div>
      )}

      {props.error ? (
        <div id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {props.error}
        </div>
      ) : null}
    </div>
  );
}
