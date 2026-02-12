import { useMemo, useState } from 'react';

import type { AdminFlowTemplate, ReviewerListItem, UpsertAdminFlowInput } from '../services/adminFlows';
import { ReviewerMultiSelect } from './ReviewerMultiSelect';
import { AsyncButton } from '../ui/AsyncButton';

type StepDraft = {
  stepKey: string;
  mode: 'Serial' | 'Parallel';
  reviewerIds: string[];
};

export function FlowEditor(props: {
  reviewers: ReviewerListItem[];
  initial?: AdminFlowTemplate;
  onCancel: () => void;
  onSave: (payload: UpsertAdminFlowInput) => void;
  isSaving?: boolean;
}) {
  const [name, setName] = useState(props.initial?.name ?? '');
  const [isActive, setIsActive] = useState<boolean>(props.initial?.isActive ?? true);
  const [steps, setSteps] = useState<StepDraft[]>(() =>
    props.initial
      ? props.initial.steps
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((s) => ({
            stepKey: s.stepKey,
            mode: s.mode,
            reviewerIds: s.assignees.map((a) => a.reviewerId),
          }))
      : [{ stepKey: 'step-1', mode: 'Serial', reviewerIds: [] }],
  );

  const canSave = useMemo(() => {
    if (name.trim().length === 0) return false;
    if (steps.length === 0) return false;
    return steps.every((s) => s.stepKey.trim().length > 0 && s.reviewerIds.length > 0);
  }, [name, steps]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{props.initial ? '編輯模板' : '新增模板'}</div>
          <div className="mt-1 text-xs text-slate-600">每個 step 至少要指派 1 位 reviewer。</div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="flow-name">
            名稱
          </label>
          <input
            id="flow-name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">Steps</div>

          {steps.map((s, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">Step #{idx + 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = steps.slice();
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setSteps(next);
                    }}
                    type="button"
                  >
                    上移
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    disabled={idx === steps.length - 1}
                    onClick={() => {
                      const next = steps.slice();
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      setSteps(next);
                    }}
                    type="button"
                  >
                    下移
                  </button>
                  <button
                    className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                    type="button"
                  >
                    刪除
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">stepKey</label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.stepKey}
                    onChange={(e) => {
                      const next = steps.slice();
                      next[idx] = { ...s, stepKey: e.target.value };
                      setSteps(next);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">mode</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={s.mode}
                    onChange={(e) => {
                      const next = steps.slice();
                      next[idx] = { ...s, mode: e.target.value as StepDraft['mode'] };
                      setSteps(next);
                    }}
                  >
                    <option value="Serial">Serial</option>
                    <option value="Parallel">Parallel</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs font-medium text-slate-700">assignees</div>
                <ReviewerMultiSelect
                  reviewers={props.reviewers}
                  value={s.reviewerIds}
                  onChange={(nextIds) => {
                    const next = steps.slice();
                    next[idx] = { ...s, reviewerIds: nextIds };
                    setSteps(next);
                  }}
                />
              </div>
            </div>
          ))}

          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setSteps([...steps, { stepKey: `step-${steps.length + 1}`, mode: 'Serial', reviewerIds: [] }])}
            type="button"
          >
            + 新增 step
          </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={props.onCancel}
            type="button"
          >
            取消
          </button>
          <AsyncButton
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={!canSave || props.isSaving}
            isLoading={props.isSaving}
            loadingText="儲存中…"
            onClick={() => {
              props.onSave({
                id: props.initial?.id,
                name: name.trim(),
                isActive,
                steps: steps.map((s, idx) => ({
                  stepKey: s.stepKey.trim(),
                  orderIndex: idx,
                  mode: s.mode,
                  reviewerIds: s.reviewerIds,
                })),
              });
            }}
            type="button"
          >
            儲存
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
