'use client';

import type { Question, RuleAction, RuleGroup, RuleOperator } from '@app/contracts';
import { newId } from './state';

const OPERATORS: Array<{ value: RuleOperator; label: string }> = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' }
];

const ACTIONS: Array<{ value: RuleAction; label: string }> = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' }
];

export function RuleBuilder({
  questions,
  ruleGroups,
  onChange
}: {
  questions: Question[];
  ruleGroups: RuleGroup[];
  onChange: (next: RuleGroup[]) => void;
}) {
  const questionOptions = questions.map((q) => ({ id: q.id, title: q.title }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Logic rules</div>
        <button
          className="rounded border px-2 py-1 text-sm"
          type="button"
          onClick={() => {
            if (questions.length === 0) return;
            const target = questions[questions.length - 1];
            onChange([
              ...ruleGroups,
              {
                id: newId('rg'),
                target_question_id: target.id,
                action: 'show',
                mode: 'AND',
                rules: [
                  {
                    id: newId('r'),
                    source_question_id: questions[0].id,
                    operator: 'equals',
                    value: ''
                  }
                ]
              }
            ]);
          }}
          disabled={questions.length === 0}
        >
          Add rule group
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-sm text-gray-600">Add questions first.</div>
      ) : null}

      {ruleGroups.length === 0 ? <div className="text-sm text-gray-600">No rules yet.</div> : null}

      <div className="space-y-3">
        {ruleGroups.map((g, idx) => (
          <div key={g.id} className="rounded border bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Group {idx + 1}</div>
              <button className="rounded border px-2 py-1 text-sm" type="button" onClick={() => onChange(ruleGroups.filter((x) => x.id !== g.id))}>
                Remove group
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 space-y-1">
                <label className="text-xs text-gray-600">Target question</label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={g.target_question_id}
                  onChange={(e) => {
                    const next = ruleGroups.slice();
                    next[idx] = { ...g, target_question_id: e.target.value };
                    onChange(next);
                  }}
                >
                  {questionOptions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3 space-y-1">
                <label className="text-xs text-gray-600">Action</label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={g.action}
                  onChange={(e) => {
                    const next = ruleGroups.slice();
                    next[idx] = { ...g, action: e.target.value as RuleAction };
                    onChange(next);
                  }}
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3 space-y-1">
                <label className="text-xs text-gray-600">Mode</label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={g.mode}
                  onChange={(e) => {
                    const next = ruleGroups.slice();
                    next[idx] = { ...g, mode: e.target.value as 'AND' | 'OR' };
                    onChange(next);
                  }}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Rules</div>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  type="button"
                  onClick={() => {
                    const next = ruleGroups.slice();
                    next[idx] = {
                      ...g,
                      rules: [
                        ...g.rules,
                        {
                          id: newId('r'),
                          source_question_id: questions[0].id,
                          operator: 'equals',
                          value: ''
                        }
                      ]
                    };
                    onChange(next);
                  }}
                >
                  Add rule
                </button>
              </div>

              {g.rules.map((r, ridx) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <label className="text-xs text-gray-600">Source</label>
                    <select
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={r.source_question_id}
                      onChange={(e) => {
                        const next = ruleGroups.slice();
                        const rules = g.rules.slice();
                        rules[ridx] = { ...r, source_question_id: e.target.value };
                        next[idx] = { ...g, rules };
                        onChange(next);
                      }}
                    >
                      {questionOptions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-600">Operator</label>
                    <select
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={r.operator}
                      onChange={(e) => {
                        const next = ruleGroups.slice();
                        const rules = g.rules.slice();
                        rules[ridx] = { ...r, operator: e.target.value as RuleOperator };
                        next[idx] = { ...g, rules };
                        onChange(next);
                      }}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <label className="text-xs text-gray-600">Value</label>
                    <input
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={typeof r.value === 'string' ? r.value : ''}
                      onChange={(e) => {
                        const next = ruleGroups.slice();
                        const rules = g.rules.slice();
                        rules[ridx] = { ...r, value: e.target.value };
                        next[idx] = { ...g, rules };
                        onChange(next);
                      }}
                    />
                  </div>

                  <button
                    className="col-span-1 rounded border px-2 py-1 text-sm"
                    type="button"
                    onClick={() => {
                      const next = ruleGroups.slice();
                      const rules = g.rules.filter((x) => x.id !== r.id);
                      next[idx] = { ...g, rules };
                      onChange(next);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
