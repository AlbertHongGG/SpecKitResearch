'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { closeSurvey, getSurveyDetail, publishSurvey, updateSurvey } from '../../../../src/features/adminDraft/api';
import { QuestionListEditor } from '../../../../src/features/adminDraft/QuestionListEditor';
import { OptionEditor } from '../../../../src/features/adminDraft/OptionEditor';
import { RuleGroupEditor } from '../../../../src/features/adminDraft/RuleGroupEditor';
import { saveDraft, toDraftPatch, type DraftPatch } from '../../../../src/features/adminDraft/saveDraft';
import { EmptyState } from '../../../../src/components/EmptyState';

type ValidationError = { path: string; message: string };

type DraftState = DraftPatch;

function cleanupReferences(draft: DraftState): DraftState {
  const questionIds = new Set(draft.questions.map((q) => q.id));

  const options = draft.options.filter((o) => questionIds.has(o.question_id));

  const rule_groups = draft.rule_groups
    .filter((g) => questionIds.has(g.target_question_id))
    .map((g) => ({
      ...g,
      rules: g.rules.filter((r) => questionIds.has(r.source_question_id)),
    }))
    .filter((g) => g.rules.length > 0);

  return { ...draft, options, rule_groups };
}

export default function SurveyEditPage() {
  const router = useRouter();
  const params = useParams<{ surveyId: string }>();
  const surveyId = params.surveyId;

  const detailQuery = useQuery({
    queryKey: ['surveys', surveyId, 'detail'],
    queryFn: () => getSurveyDetail(surveyId),
  });

  const initialDraft = useMemo(() => {
    if (!detailQuery.data) return null;
    return toDraftPatch(detailQuery.data);
  }, [detailQuery.data]);

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<ValidationError[] | null>(null);

  useEffect(() => {
    if (!initialDraft) return;
    setDraft((prev) => prev ?? initialDraft);
    setSelectedQuestionId((prev) => prev ?? initialDraft.questions[0]?.id ?? null);
  }, [initialDraft]);

  const selectedQuestion = useMemo(() => {
    if (!draft || !selectedQuestionId) return null;
    return draft.questions.find((q) => q.id === selectedQuestionId) ?? null;
  }, [draft, selectedQuestionId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Draft not loaded');
      setSaveErrors(null);
      return await saveDraft(surveyId, cleanupReferences(draft));
    },
    onSuccess: async () => {
      await detailQuery.refetch();
    },
    onError: (err: unknown) => {
      const body = typeof err === 'object' && err !== null ? (err as { body?: unknown }).body : undefined;
      const errors = typeof body === 'object' && body !== null ? (body as { errors?: unknown }).errors : undefined;
      if (Array.isArray(errors)) {
        const parsed: ValidationError[] = [];
        for (const e of errors) {
          if (typeof e !== 'object' || e === null) continue;
          const path = (e as { path?: unknown }).path;
          const message = (e as { message?: unknown }).message;
          if (typeof path === 'string' && typeof message === 'string') parsed.push({ path, message });
        }
        if (parsed.length > 0) setSaveErrors(parsed);
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!confirm('Publish this survey? This will lock the structure.')) return null;
      return await publishSurvey(surveyId);
    },
    onSuccess: async () => {
      await detailQuery.refetch();
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!confirm('Close this survey? Public access will be disabled.')) return null;
      return await closeSurvey(surveyId);
    },
    onSuccess: async () => {
      await detailQuery.refetch();
    },
  });

  const updateMetaMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Draft not loaded');
      return await updateSurvey(surveyId, { title: draft.title, description: draft.description });
    },
    onSuccess: async () => {
      await detailQuery.refetch();
    },
  });

  if (detailQuery.isLoading || !draft) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState title="Loading survey…" />
      </main>
    );
  }

  if (detailQuery.error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState
          title="Failed to load survey"
          description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load'}
          action={
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
              onClick={() => detailQuery.refetch()}
            >
              Retry
            </button>
          }
        />
      </main>
    );
  }

  const survey = detailQuery.data?.survey;
  const status = survey?.status ?? 'Draft';

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit draft</h1>
          <p className="mt-1 text-sm text-zinc-600">{survey?.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" href="/surveys">
            Back
          </Link>
          <Link
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
            href={`/surveys/${surveyId}/preview`}
          >
            Preview
          </Link>
          <Link
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
            href={`/surveys/${surveyId}/results`}
          >
            Results
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Survey settings</h2>
        <div className="mt-1 text-xs text-zinc-500">
          Status: <span className="font-mono">{status}</span>
          {survey?.publish_hash ? (
            <>
              {' '}
              · Publish hash: <span className="font-mono">{survey.publish_hash}</span>
            </>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block text-xs md:col-span-1">
            <div className="mb-1 text-zinc-700">Title</div>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <label className="block text-xs md:col-span-2">
            <div className="mb-1 text-zinc-700">Description</div>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_anonymous}
              onChange={(e) => setDraft({ ...draft, is_anonymous: e.target.checked })}
            />
            Anonymous responses
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {status === 'Draft' ? (
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save draft'}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={updateMetaMutation.isPending}
              onClick={() => updateMetaMutation.mutate()}
            >
              {updateMetaMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          )}

          {status === 'Draft' ? (
            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? 'Publishing…' : 'Publish'}
            </button>
          ) : null}

          {status === 'Published' ? (
            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
              disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? 'Closing…' : 'Close'}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm"
            onClick={() => {
              setDraft(initialDraft);
              setSaveErrors(null);
            }}
            disabled={!initialDraft}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm"
            onClick={() => router.push('/surveys')}
          >
            Done
          </button>
        </div>

        {saveMutation.isSuccess ? (
          <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</div>
        ) : null}

        {saveMutation.error ? (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}
          </div>
        ) : null}

        {saveErrors && saveErrors.length > 0 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Validation errors</div>
            <ul className="mt-2 list-disc pl-5">
              {saveErrors.map((e) => (
                <li key={e.path + e.message}>
                  <span className="font-mono">{e.path}</span>: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {status === 'Draft' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <QuestionListEditor
              questions={draft.questions}
              selectedQuestionId={selectedQuestionId}
              onSelectQuestionId={setSelectedQuestionId}
              onChange={(nextQuestions) => {
                const next = cleanupReferences({ ...draft, questions: nextQuestions });
                setDraft(next);
              }}
            />
            <OptionEditor
              question={selectedQuestion}
              options={draft.options}
              onChange={(nextOptions) => setDraft({ ...draft, options: nextOptions })}
            />
          </div>

          <RuleGroupEditor
            questions={draft.questions}
            options={draft.options}
            ruleGroups={draft.rule_groups}
            onChange={(nextRuleGroups) => setDraft({ ...draft, rule_groups: nextRuleGroups })}
          />
        </div>
      ) : (
        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Structural editing is disabled after publish. Use Results/Export to view responses.
        </section>
      )}
    </main>
  );
}
