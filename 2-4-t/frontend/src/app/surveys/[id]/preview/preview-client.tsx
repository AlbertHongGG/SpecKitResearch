'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageError, PageLoading } from '@/components/page-states';
import { useSession } from '@/features/auth/api';
import { ApiError } from '@/lib/api/client';
import { useSurvey } from '@/features/surveys/api';
import { toPreviewSurvey } from '@/features/preview/simulate';
import { recomputeVisibility } from '@/features/respond/visibility';
import { clearHiddenAnswers } from '@/features/respond/clear-hidden';
import { orderedVisibleQuestionIds, firstUnansweredQuestionId, nextQuestionId, prevAnsweredVisibleQuestionId } from '@/features/respond/navigation';
import { QuestionRenderer } from '@/features/respond/QuestionRenderer';

export function PreviewSurveyClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const user = session?.user ?? null;

  const { data, isLoading, error, refetch } = useSurvey(id);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const previousVisibleRef = useRef<Set<string> | undefined>(undefined);

  const previewSurvey = data?.survey ? toPreviewSurvey(data.survey) : null;

  const visibility = useMemo(() => {
    if (!previewSurvey) return null;
    return recomputeVisibility(previewSurvey, answers, previousVisibleRef.current);
  }, [previewSurvey, answers]);

  useEffect(() => {
    if (!previewSurvey || !visibility) return;
    if (visibility.becameHiddenQuestionIds.length) {
      setAnswers((prev) => clearHiddenAnswers(prev, visibility.becameHiddenQuestionIds));
    }
    previousVisibleRef.current = visibility.visibleQuestionIds;
  }, [previewSurvey, visibility]);

  const visibleIds = useMemo(() => {
    if (!previewSurvey || !visibility) return [] as string[];
    return orderedVisibleQuestionIds(previewSurvey, visibility.visibleQuestionIds);
  }, [previewSurvey, visibility]);

  useEffect(() => {
    if (!previewSurvey || visibleIds.length === 0) return;
    setCurrentId((prev) => prev ?? firstUnansweredQuestionId(visibleIds, answers));
  }, [previewSurvey, visibleIds, answers]);

  if (sessionLoading) return <PageLoading title="Loading…" />;
  if (!user) {
    return (
      <div className="space-y-3">
        <PageError title="Login required" detail="Preview is owner-only." />
        <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/preview`)}`}>
          Go to login
        </a>
      </div>
    );
  }

  if (isLoading) return <PageLoading title="Loading preview…" />;
  if (error) {
    const status = error instanceof ApiError ? error.status : null;
    if (status === 401) {
      return (
        <div className="space-y-3">
          <PageError title="Login required" />
          <a className="rounded border px-3 py-1 inline-block" href={`/login?return_to=${encodeURIComponent(`/surveys/${id}/preview`)}`}>
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

  if (!previewSurvey || !visibility) return <PageError title="Survey not found" />;

  const currentQuestion = previewSurvey.questions.find((q) => q.id === currentId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Preview</h1>
          <div className="text-sm text-gray-600">
            {previewSurvey.title} • <span className="font-mono">/s/{previewSurvey.slug}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1" onClick={() => router.push(`/surveys/${id}/edit`)}>
            Back to edit
          </button>
          <button className="rounded border px-3 py-1" onClick={() => { setAnswers({}); setCurrentId(null); }}>
            Reset
          </button>
        </div>
      </div>

      {currentQuestion ? (
        <div className="rounded border bg-white p-4">
          <QuestionRenderer
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: v }))}
          />
        </div>
      ) : (
        <PageError title="No visible questions" />
      )}

      <div className="flex items-center justify-between">
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={!currentId || !prevAnsweredVisibleQuestionId(visibleIds, currentId, answers)}
          onClick={() => {
            if (!currentId) return;
            const prev = prevAnsweredVisibleQuestionId(visibleIds, currentId, answers);
            if (prev) setCurrentId(prev);
          }}
        >
          Back
        </button>

        <button
          className="rounded border px-3 py-1"
          onClick={() => {
            if (!currentId) return;
            const next = nextQuestionId(visibleIds, currentId, answers);
            if (next) setCurrentId(next);
          }}
        >
          Next
        </button>
      </div>

      <div className="rounded border bg-white p-3 text-sm text-gray-600">Visible questions: {visibleIds.length}</div>
    </div>
  );
}
