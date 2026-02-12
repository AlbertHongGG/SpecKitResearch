'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import type { Option, Question } from '@acme/contracts';

import { usePublicSurvey } from '../../../src/features/publicSurvey/usePublicSurvey';
import { useDraftAnswers } from '../../../src/features/respondent/useDraftAnswers';
import { computeVisibilityForPublicSurvey } from '../../../src/features/respondent/computeVisibility';
import { validateVisibleRequired } from '../../../src/features/respondent/validateVisibleRequired';
import { submitResponse } from '../../../src/features/respondent/submitResponse';
import { buildLoginUrl } from '../../../src/features/auth/returnTo';
import { SurveyStepper } from '../../../src/features/respondent/SurveyStepper';
import { QuestionRenderer } from '../../../src/features/respondent/QuestionRenderer';
import { EmptyState } from '../../../src/components/EmptyState';

export default function PublicSurveyPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const surveyQuery = usePublicSurvey(slug);
  const draft = useDraftAnswers(slug);

  const [activeIndex, setActiveIndex] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const publicSurvey = surveyQuery.data;

  const deferredAnswersById = useDeferredValue(draft.answersById);

  const visibility = useMemo(() => {
    if (!publicSurvey) return null;
    return computeVisibilityForPublicSurvey(publicSurvey, deferredAnswersById);
  }, [publicSurvey, deferredAnswersById]);

  const visibleQuestions = useMemo(() => {
    if (!publicSurvey || !visibility) return [] as Question[];
    const visibleSet = new Set(visibility.visible_question_ids);
    return publicSurvey.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter((q) => visibleSet.has(q.id));
  }, [publicSurvey, visibility]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, visibleQuestions.length - 1)));
  }, [visibleQuestions.length]);

  const lastHiddenKeyRef = useRef<string>('');
  useEffect(() => {
    if (!visibility) return;

    const hiddenKey = visibility.hidden_question_ids.slice().sort().join('|');
    if (hiddenKey === lastHiddenKeyRef.current) return;
    lastHiddenKeyRef.current = hiddenKey;

    draft.clearAnswers(visibility.hidden_question_ids);
  }, [draft, visibility]);

  const optionsByQuestionId = useMemo(() => {
    const map = new Map<string, Option[]>();
    if (!publicSurvey) return map;
    for (const opt of publicSurvey.options) {
      const list = map.get(opt.question_id) ?? [];
      list.push(opt);
      map.set(opt.question_id, list);
    }
    return map;
  }, [publicSurvey]);

  const activeQuestion = visibleQuestions[activeIndex] ?? null;

  function clearHiddenAnswers() {
    if (!visibility) return;
    draft.clearAnswers(visibility.hidden_question_ids);
  }

  function onPrev() {
    clearHiddenAnswers();
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function onNext() {
    clearHiddenAnswers();
    if (!activeQuestion) return;

    const errs = validateVisibleRequired([activeQuestion], draft.answersById);
    setClientErrors(errs);
    if (errs[activeQuestion.id]) return;

    setActiveIndex((i) => Math.min(visibleQuestions.length - 1, i + 1));
  }

  async function onSubmit() {
    if (!publicSurvey) return;

    clearHiddenAnswers();

    const errs = validateVisibleRequired(visibleQuestions, draft.answersById);
    setClientErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstMissing = visibleQuestions.find((q) => errs[q.id]);
      if (firstMissing) {
        const idx = visibleQuestions.findIndex((q) => q.id === firstMissing.id);
        if (idx >= 0) setActiveIndex(idx);
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const resp = await submitResponse({
        survey_id: publicSurvey.survey.id,
        publish_hash: publicSurvey.publish_hash,
        answers: draft.toSubmitArray,
      });

      draft.reset();
      router.push(`/s/${encodeURIComponent(slug)}/complete?response_hash=${encodeURIComponent(resp.response_hash)}`);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
          ? ((err as { status: number }).status as number)
          : undefined;
      if (status === 401) {
        router.push(buildLoginUrl(`/s/${encodeURIComponent(slug)}`));
        return;
      }

      const body =
        typeof err === 'object' && err !== null && 'body' in err ? (err as { body?: unknown }).body : undefined;
      const bodyMessage =
        typeof body === 'object' && body !== null && typeof (body as { message?: unknown }).message === 'string'
          ? ((body as { message: string }).message as string)
          : undefined;
      const bodyErrors =
        typeof body === 'object' && body !== null && Array.isArray((body as { errors?: unknown }).errors)
          ? ((body as { errors: unknown[] }).errors as unknown[])
          : undefined;

      if (status === 422 && bodyErrors) {
        setSubmitError('Validation failed. Please review your answers.');
        return;
      }

      setSubmitError(bodyMessage ?? (err instanceof Error ? err.message : 'Submit failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (surveyQuery.isLoading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <EmptyState title="Loading survey…" description="Please wait." />
      </main>
    );
  }

  if (surveyQuery.isError || !publicSurvey || !visibility) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <EmptyState title="Survey unavailable" description="Survey not found or unavailable." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{publicSurvey.survey.title}</h1>
        {publicSurvey.survey.description ? (
          <p className="mt-1 text-sm text-zinc-600">{publicSurvey.survey.description}</p>
        ) : null}
      </div>

      {submitError ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{submitError}</div> : null}

      <div className="space-y-4">
        {activeQuestion ? (
          <QuestionRenderer
            question={activeQuestion}
            options={optionsByQuestionId.get(activeQuestion.id) ?? []}
            value={draft.answersById[activeQuestion.id]}
            onChange={(v) => {
              setClientErrors((prev) => {
                const next = { ...prev };
                delete next[activeQuestion.id];
                return next;
              });
              draft.setAnswer(activeQuestion.id, v);
            }}
            error={clientErrors[activeQuestion.id]}
          />
        ) : (
          <EmptyState title="No visible questions" description="Try changing previous answers or check survey rules." />
        )}

        <SurveyStepper
          visibleQuestions={visibleQuestions}
          activeIndex={activeQuestion ? activeIndex : 0}
          onPrev={onPrev}
          onNext={onNext}
          canPrev={activeIndex > 0}
          canNext={activeQuestion ? activeIndex < visibleQuestions.length - 1 : false}
        />

        <button
          type="button"
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={submitting || visibleQuestions.length === 0}
          onClick={onSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      <div className="mt-6 text-xs text-zinc-500">
        publish_hash: <span className="font-mono">{publicSurvey.publish_hash}</span>
      </div>
    </main>
  );
}
