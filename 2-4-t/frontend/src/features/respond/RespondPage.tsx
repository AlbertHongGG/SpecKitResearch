'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicSurveySchema } from '@app/contracts';
import { apiFetchJson, ApiError } from '@/lib/api/client';
import { PageError, PageLoading } from '@/components/page-states';
import type { RespondFlowState } from './state';
import { recomputeVisibility } from './visibility';
import { clearHiddenAnswers } from './clear-hidden';
import { orderedVisibleQuestionIds, firstUnansweredQuestionId, nextQuestionId, prevAnsweredVisibleQuestionId } from './navigation';
import { QuestionRenderer } from './QuestionRenderer';
import { submitResponse } from './submit';
import { Completion } from './Completion';
import { loadDraftAnswers, saveDraftAnswers } from '@/features/draft/storage';
import { loginUrl } from './auth-redirect';
import { useSession } from '@/features/auth/api';

async function fetchPublicSurvey(slug: string) {
  const data = await apiFetchJson<{ survey: unknown; publish_hash: string }>(`/s/${encodeURIComponent(slug)}`);
  const survey = PublicSurveySchema.parse(data.survey);
  return { survey, publishHash: data.publish_hash };
}

export function RespondPage({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publicSurvey', slug],
    queryFn: () => fetchPublicSurvey(slug)
  });

  const [flow, setFlow] = useState<RespondFlowState>({ tag: 'Answering' });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const previousVisibleRef = useRef<Set<string> | undefined>(undefined);

  const survey = data?.survey;
  const publishHash = data?.publishHash;

  useEffect(() => {
    if (!survey || !publishHash) return;
    const loaded = loadDraftAnswers(slug, publishHash);
    setAnswers(loaded);
  }, [slug, survey, publishHash]);

  const visibility = useMemo(() => {
    if (!survey) return null;
    return recomputeVisibility(survey, answers, previousVisibleRef.current);
  }, [survey, answers]);

  useEffect(() => {
    if (!survey || !publishHash || !visibility) return;

    // Clear hidden answers (visible -> hidden)
    if (visibility.becameHiddenQuestionIds.length) {
      setAnswers((prev) => clearHiddenAnswers(prev, visibility.becameHiddenQuestionIds));
    }

    previousVisibleRef.current = visibility.visibleQuestionIds;

    // Persist draft
    saveDraftAnswers(slug, publishHash, answers);
  }, [slug, survey, publishHash, visibility, answers]);

  const visibleIds = useMemo(() => {
    if (!survey || !visibility) return [] as string[];
    return orderedVisibleQuestionIds(survey, visibility.visibleQuestionIds);
  }, [survey, visibility]);

  useEffect(() => {
    if (!survey || visibleIds.length === 0) return;
    setCurrentId((prev) => prev ?? firstUnansweredQuestionId(visibleIds, answers));
  }, [survey, visibleIds, answers]);

  if (isLoading) return <PageLoading title="Loading survey…" />;
  if (error) {
    return (
      <div className="space-y-3">
        <PageError title="Failed to load survey" detail={(error as Error).message} />
        <button className="rounded border px-3 py-1" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (!survey || !publishHash || !visibility) return <PageError title="Survey not found" />;

  if (flow.tag === 'Completion') {
    return <Completion responseId={flow.responseId} publishHash={flow.publishHash} responseHash={flow.responseHash} />;
  }

  const currentQuestion = survey.questions.find((q) => q.id === currentId) ?? null;
  const canSubmit = flow.tag !== 'Submitting';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        {survey.description ? <div className="mt-1 text-gray-700">{survey.description}</div> : null}
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

        <div className="flex gap-2">
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

          <button
            className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
            disabled={!canSubmit}
            onClick={async () => {
              setFlow({ tag: 'Submitting' });
              try {
                const payload = {
                  answers: visibleIds
                    .filter((qid) => qid in answers)
                    .map((qid) => ({ question_id: qid, value: answers[qid] }))
                };

                const res = await submitResponse(slug, payload, session?.csrf_token);
                setFlow({ tag: 'Completion', responseId: res.response_id, publishHash: res.publish_hash, responseHash: res.response_hash });
              } catch (e) {
                setFlow({ tag: 'Answering' });
                if (e instanceof ApiError && e.status === 401) {
                  window.location.href = loginUrl(`/s/${slug}`);
                  return;
                }
                alert((e as Error).message);
              }
            }}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-3 text-sm text-gray-600">
        Visible questions: {visibleIds.length}
      </div>
    </div>
  );
}
