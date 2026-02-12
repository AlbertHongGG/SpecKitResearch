'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageError, PageLoading } from '@/components/page-states';
import { useSession } from '@/features/auth/api';
import { ApiError } from '@/lib/api/client';
import { useSurvey, useUpdateSurvey } from '@/features/surveys/api';
import { editorStateFromSurvey } from '@/features/editor/state';
import type { EditorState } from '@/features/editor/state';
import { QuestionEditor } from '@/features/editor/QuestionEditor';
import { RuleBuilder } from '@/features/editor/RuleBuilder';
import { validateDraftClient } from '@/features/editor/validate';
import { PublishCloseActions } from '@/features/editor/PublishCloseActions';

export function EditSurveyClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const csrfToken = session?.csrf_token;
  const user = session?.user ?? null;

  const { data, isLoading, error, refetch } = useSurvey(id);
  const update = useUpdateSurvey(id, csrfToken);

  const [state, setState] = useState<EditorState | null>(null);

  useEffect(() => {
    if (!data?.survey) return;
    setState(editorStateFromSurvey(data.survey));
  }, [data?.survey?.id]);

  const validationErrors = useMemo(() => {
    if (!state) return [];
    return validateDraftClient({ questions: state.questions, rule_groups: state.rule_groups });
  }, [state]);

  if (sessionLoading) return <PageLoading title="Loading…" />;
  if (!user) {
    return (
      <div className="space-y-3">
        <PageError title="Login required" />
        <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/edit`)}`}>
          Go to login
        </a>
      </div>
    );
  }

  if (isLoading) return <PageLoading title="Loading survey…" />;
  if (error) {
    const status = error instanceof ApiError ? error.status : null;
    if (status === 401) {
      return (
        <div className="space-y-3">
          <PageError title="Login required" />
          <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/edit`)}`}>
            Go to login
          </a>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <PageError title="Failed to load survey" detail={(error as Error).message} />
        <button className="rounded border px-3 py-1" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const survey = data?.survey;
  if (!survey || !state) return <PageError title="Survey not found" />;

  const canSave = !!csrfToken && !update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit survey</h1>
          <div className="text-sm text-gray-600">
            Status: {survey.status} • Public link: <a className="underline" href={`/s/${survey.slug}`}>/s/{survey.slug}</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PublishCloseActions
            surveyId={id}
            status={survey.status}
            csrfToken={csrfToken}
            canPublish={validationErrors.length === 0}
          />
          <button className="rounded border px-3 py-1" onClick={() => router.push(`/surveys/${id}/preview`)}>
            Preview
          </button>
          <button
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
            disabled={!canSave}
            onClick={async () => {
              if (!state) return;
              const res = await update.mutateAsync({
                title: state.title,
                description: state.description,
                is_anonymous: state.is_anonymous,
                questions: state.questions,
                rule_groups: state.rule_groups
              });
              setState(editorStateFromSurvey(res.survey));
            }}
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Title</label>
            <input className="w-full rounded border px-3 py-2" value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={state.description ?? ''}
              onChange={(e) => setState({ ...state, description: e.target.value ? e.target.value : null })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.is_anonymous}
              onChange={(e) => setState({ ...state, is_anonymous: e.target.checked })}
              disabled={survey.status !== 'DRAFT'}
            />
            Anonymous (no login required to respond)
          </label>
        </div>
      </div>

      {validationErrors.length ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">Draft validation</div>
          <ul className="list-disc pl-5">
            {validationErrors.map((e, i) => (
              <li key={i}>
                {e.code}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <QuestionEditor questions={state.questions} onChange={(qs) => setState({ ...state, questions: qs })} />
      <RuleBuilder questions={state.questions} ruleGroups={state.rule_groups} onChange={(gs) => setState({ ...state, rule_groups: gs })} />

      {update.error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {(update.error as Error).message}
        </div>
      ) : null}

      <div className="text-sm text-gray-600">IDs are persisted; reordering questions changes rule forward-only constraints.</div>
    </div>
  );
}
