'use client';

import { GroupOperatorSchema, RuleActionSchema, RuleOperatorSchema } from '@acme/contracts';
import type { z } from 'zod';

import type { DraftOptionInput, DraftQuestionInput, DraftRuleGroupInput, DraftRuleInput } from './saveDraft';

type RuleAction = z.infer<typeof RuleActionSchema>;
type GroupOperator = z.infer<typeof GroupOperatorSchema>;
type RuleOperator = z.infer<typeof RuleOperatorSchema>;

function newId(): string {
  return crypto.randomUUID();
}

function questionLabel(q: DraftQuestionInput) {
  return `Q${q.order}: ${q.title || '(untitled)'}`;
}

export function RuleGroupEditor(props: {
  questions: DraftQuestionInput[];
  options: DraftOptionInput[];
  ruleGroups: DraftRuleGroupInput[];
  onChange: (next: DraftRuleGroupInput[]) => void;
}) {
  const questionsSorted = props.questions.slice().sort((a, b) => a.order - b.order);

  function setGroup(id: string, patch: Partial<DraftRuleGroupInput>) {
    props.onChange(props.ruleGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function setRule(groupId: string, ruleId: string, patch: Partial<DraftRuleInput>) {
    props.onChange(
      props.ruleGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          rules: g.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
        };
      }),
    );
  }

  function addGroup() {
    const target = questionsSorted[0]?.id;
    const source = questionsSorted[0]?.id;
    if (!target || !source) return;

    const next: DraftRuleGroupInput[] = [
      ...props.ruleGroups,
      {
        id: newId(),
        target_question_id: target,
        action: 'show',
        group_operator: 'AND',
        rules: [
          {
            id: newId(),
            source_question_id: source,
            operator: 'equals',
            value: '',
          },
        ],
      },
    ];
    props.onChange(next);
  }

  function removeGroup(id: string) {
    props.onChange(props.ruleGroups.filter((g) => g.id !== id));
  }

  function addRule(groupId: string) {
    const source = questionsSorted[0]?.id;
    if (!source) return;
    props.onChange(
      props.ruleGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          rules: [
            ...g.rules,
            {
              id: newId(),
              source_question_id: source,
              operator: 'equals',
              value: '',
            },
          ],
        };
      }),
    );
  }

  function removeRule(groupId: string, ruleId: string) {
    props.onChange(
      props.ruleGroups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, rules: g.rules.filter((r) => r.id !== ruleId) };
      }),
    );
  }

  function optionValuesForQuestion(questionId: string): string[] {
    return props.options.filter((o) => o.question_id === questionId).map((o) => o.value);
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Rule groups</h2>
        <button
          type="button"
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={addGroup}
          disabled={questionsSorted.length === 0}
        >
          Add group
        </button>
      </div>

      {props.ruleGroups.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No rule groups yet.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {props.ruleGroups.map((g, groupIdx) => {
            const targetQuestion = questionsSorted.find((q) => q.id === g.target_question_id) ?? null;
            return (
              <div key={g.id} className="rounded-md border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Group {groupIdx + 1}</div>
                    <div className="mt-0.5 text-xs text-zinc-600">
                      Target: {targetQuestion ? questionLabel(targetQuestion) : g.target_question_id}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                    onClick={() => removeGroup(g.id)}
                  >
                    Delete group
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block text-xs">
                    <div className="mb-1 text-zinc-700">Target question</div>
                    <select
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      value={g.target_question_id}
                      onChange={(e) => setGroup(g.id, { target_question_id: e.target.value })}
                    >
                      {questionsSorted.map((q) => (
                        <option key={q.id} value={q.id}>
                          {questionLabel(q)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs">
                    <div className="mb-1 text-zinc-700">Action</div>
                    <select
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      value={g.action}
                      onChange={(e) => setGroup(g.id, { action: e.target.value as RuleAction })}
                    >
                      {RuleActionSchema.options.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs">
                    <div className="mb-1 text-zinc-700">Group operator</div>
                    <select
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      value={g.group_operator}
                      onChange={(e) => setGroup(g.id, { group_operator: e.target.value as GroupOperator })}
                    >
                      {GroupOperatorSchema.options.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-700">Rules</div>
                  <button
                    type="button"
                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
                    onClick={() => addRule(g.id)}
                    disabled={questionsSorted.length === 0}
                  >
                    Add rule
                  </button>
                </div>

                {g.rules.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-600">No rules in this group.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {g.rules.map((r) => {
                      const sourceValues = optionValuesForQuestion(r.source_question_id);
                      const datalistId = `values-${g.id}-${r.id}`;
                      return (
                        <div key={r.id} className="grid gap-2 md:grid-cols-12">
                          <label className="md:col-span-4">
                            <div className="mb-1 text-xs text-zinc-700">Source question</div>
                            <select
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                              value={r.source_question_id}
                              onChange={(e) => setRule(g.id, r.id, { source_question_id: e.target.value })}
                            >
                              {questionsSorted.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {questionLabel(q)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="md:col-span-3">
                            <div className="mb-1 text-xs text-zinc-700">Operator</div>
                            <select
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                              value={r.operator}
                              onChange={(e) => setRule(g.id, r.id, { operator: e.target.value as RuleOperator })}
                            >
                              {RuleOperatorSchema.options.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="md:col-span-4">
                            <div className="mb-1 text-xs text-zinc-700">Value</div>
                            <input
                              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                              value={r.value}
                              onChange={(e) => setRule(g.id, r.id, { value: e.target.value })}
                              list={sourceValues.length > 0 ? datalistId : undefined}
                            />
                            {sourceValues.length > 0 ? (
                              <datalist id={datalistId}>
                                {sourceValues.map((v) => (
                                  <option key={v} value={v} />
                                ))}
                              </datalist>
                            ) : null}
                          </label>

                          <div className="md:col-span-1 flex items-end">
                            <button
                              type="button"
                              className="w-full rounded-md border border-red-200 px-2 py-2 text-xs text-red-700"
                              onClick={() => removeRule(g.id, r.id)}
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
