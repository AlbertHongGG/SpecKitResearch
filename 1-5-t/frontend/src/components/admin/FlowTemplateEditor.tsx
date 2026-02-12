import type { FlowStepInput, UpsertFlowTemplateRequest } from '@internal/contracts';
import { UpsertFlowTemplateRequestSchema } from '@internal/contracts';
import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ReviewerPicker } from './ReviewerPicker';

type EditorValue = {
  name: string;
  isActive: boolean;
  steps: Array<{
    stepKey: string;
    orderIndex: number;
    mode: 'Serial' | 'Parallel';
    assigneeIds: string[];
  }>;
};

function toRequest(value: EditorValue): UpsertFlowTemplateRequest {
  return {
    name: value.name,
    isActive: value.isActive,
    steps: value.steps.map((s) => ({
      stepKey: s.stepKey,
      orderIndex: s.orderIndex,
      mode: s.mode,
      assigneeIds: s.assigneeIds,
    })),
  };
}

function nextDefaultStep(orderIndex: number): FlowStepInput {
  return {
    stepKey: `s${orderIndex + 1}`,
    orderIndex,
    mode: 'Parallel',
    assigneeIds: [],
  };
}

export function FlowTemplateEditor(props: {
  initial?: Partial<EditorValue>;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (body: UpsertFlowTemplateRequest) => Promise<void>;
}) {
  const { initial, submitLabel, onCancel, onSubmit } = props;

  const [value, setValue] = useState<EditorValue>(() => {
    const steps = (initial?.steps && initial.steps.length > 0 ? initial.steps : [nextDefaultStep(0)])
      .map((s, idx) => ({
        stepKey: s.stepKey ?? `s${idx + 1}`,
        orderIndex: typeof s.orderIndex === 'number' ? s.orderIndex : idx,
        mode: s.mode ?? 'Parallel',
        assigneeIds: Array.isArray(s.assigneeIds) ? s.assigneeIds : [],
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s, idx) => ({ ...s, orderIndex: idx }));

    return {
      name: initial?.name ?? '',
      isActive: initial?.isActive ?? true,
      steps,
    };
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const derived = useMemo(() => {
    const body = toRequest(value);
    const parsed = UpsertFlowTemplateRequestSchema.safeParse(body);
    return { body, parsed };
  }, [value]);

  async function handleSubmit() {
    setError(null);

    if (!derived.parsed.success) {
      const msg = derived.parsed.error.issues[0]?.message ?? '表單驗證失敗';
      setError(msg);
      return;
    }

    // Extra UX: enforce Serial step exactly one assignee before hitting server.
    const serialInvalid = derived.body.steps.find((s) => s.mode === 'Serial' && s.assigneeIds.length !== 1);
    if (serialInvalid) {
      setError('Serial step 必須且只能選 1 位 reviewer');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(derived.body);
    } catch (e: any) {
      setError(e?.message ?? '送出失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">模板編輯</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button loading={isSubmitting} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm text-slate-700">名稱</div>
          <Input
            value={value.name}
            onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
            placeholder="例如：一般文件審核流程"
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm text-slate-700">狀態</div>
          <Select
            value={value.isActive ? 'active' : 'inactive'}
            onChange={(e) => setValue((v) => ({ ...v, isActive: e.target.value === 'active' }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Steps</div>
          <Button
            variant="secondary"
            onClick={() => {
              setValue((v) => {
                const next = [...v.steps, nextDefaultStep(v.steps.length)];
                return { ...v, steps: next.map((s, idx) => ({ ...s, orderIndex: idx })) };
              });
            }}
          >
            新增 Step
          </Button>
        </div>

        <div className="space-y-3">
          {value.steps.map((step, idx) => {
            const isSerial = step.mode === 'Serial';
            return (
              <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Step {idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={idx === 0}
                      onClick={() => {
                        setValue((v) => {
                          const steps = [...v.steps];
                          if (idx <= 0) return v;
                          const a = steps[idx - 1];
                          const b = steps[idx];
                          if (!a || !b) return v;
                          steps[idx - 1] = b;
                          steps[idx] = a;
                          return { ...v, steps: steps.map((s, i) => ({ ...s, orderIndex: i })) };
                        });
                      }}
                    >
                      上移
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={idx === value.steps.length - 1}
                      onClick={() => {
                        setValue((v) => {
                          const steps = [...v.steps];
                          if (idx >= steps.length - 1) return v;
                          const a = steps[idx];
                          const b = steps[idx + 1];
                          if (!a || !b) return v;
                          steps[idx] = b;
                          steps[idx + 1] = a;
                          return { ...v, steps: steps.map((s, i) => ({ ...s, orderIndex: i })) };
                        });
                      }}
                    >
                      下移
                    </Button>
                    <Button
                      variant="danger"
                      disabled={value.steps.length <= 1}
                      onClick={() => {
                        setValue((v) => {
                          const steps = v.steps.filter((_, i) => i !== idx);
                          return { ...v, steps: steps.map((s, i) => ({ ...s, orderIndex: i })) };
                        });
                      }}
                    >
                      移除
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-sm text-slate-700">stepKey</div>
                    <Input
                      value={step.stepKey}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        setValue((v) => {
                          const steps = [...v.steps];
                          const current = steps[idx];
                          if (!current) return v;
                          steps[idx] = { ...current, stepKey: nextKey };
                          return { ...v, steps };
                        });
                      }}
                      placeholder={`例如：s${idx + 1}`}
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-sm text-slate-700">mode</div>
                    <Select
                      value={step.mode}
                      onChange={(e) => {
                        const mode = e.target.value as 'Serial' | 'Parallel';
                        setValue((v) => {
                          const steps = [...v.steps];
                          const current = steps[idx];
                          if (!current) return v;
                          const nextAssignees =
                            mode === 'Serial' ? current.assigneeIds.slice(0, 1) : current.assigneeIds;
                          steps[idx] = { ...current, mode, assigneeIds: nextAssignees };
                          return { ...v, steps };
                        });
                      }}
                    >
                      <option value="Parallel">Parallel（多人全簽）</option>
                      <option value="Serial">Serial（單人逐步）</option>
                    </Select>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-slate-700">Assignees（{isSerial ? '選 1 位' : '可複選'}）</div>
                  <ReviewerPicker
                    multiple={!isSerial}
                    value={step.assigneeIds}
                    onChange={(next) => {
                      setValue((v) => {
                        const steps = [...v.steps];
                        const current = steps[idx];
                        if (!current) return v;
                        steps[idx] = { ...current, assigneeIds: next };
                        return { ...v, steps };
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
