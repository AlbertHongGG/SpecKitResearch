'use client';

import type { Question } from '@app/contracts';

export function QuestionRenderer({
  question,
  value,
  onChange
}: {
  question: Question;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-lg font-semibold">
          {question.title} {question.required ? <span className="text-red-600">*</span> : null}
        </div>
        {question.description ? <div className="mt-1 text-sm text-gray-600">{question.description}</div> : null}
      </div>

      {question.type === 'SC' ? (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.type === 'MC' ? (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt.value);
            return (
              <label key={opt.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(arr);
                    if (e.target.checked) next.add(opt.value);
                    else next.delete(opt.value);
                    onChange(Array.from(next));
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.type === 'TEXT' ? (
        <input
          className="w-full rounded border px-3 py-2"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      ) : null}

      {question.type === 'NUMBER' || question.type === 'RATING' ? (
        <input
          className="w-full rounded border px-3 py-2"
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          placeholder="0"
        />
      ) : null}

      {question.type === 'MATRIX' ? (
        <textarea
          className="w-full rounded border px-3 py-2 font-mono text-sm"
          rows={6}
          value={value && typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}
          onChange={(e) => {
            try {
              onChange(e.target.value ? JSON.parse(e.target.value) : undefined);
            } catch {
              onChange(e.target.value);
            }
          }}
          placeholder='{ "row1": "colA" }'
        />
      ) : null}
    </div>
  );
}
