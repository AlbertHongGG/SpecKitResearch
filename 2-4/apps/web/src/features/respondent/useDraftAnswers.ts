'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type DraftAnswersByQuestionId = Record<string, unknown>;

function storageKey(slug: string) {
  return `draftAnswers:${slug}`;
}

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function useDraftAnswers(slug: string) {
  const [answers, setAnswers] = useState<DraftAnswersByQuestionId>({});

  useEffect(() => {
    if (!slug) return;
    const raw = localStorage.getItem(storageKey(slug));
    const parsed = safeParse(raw);
    if (isRecord(parsed)) {
      setAnswers(parsed);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(storageKey(slug), JSON.stringify(answers));
  }, [slug, answers]);

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const clearAnswers = useCallback((questionIds: string[]) => {
    if (questionIds.length === 0) return;
    setAnswers((prev) => {
      const next: DraftAnswersByQuestionId = { ...prev };
      for (const id of questionIds) delete next[id];
      return next;
    });
  }, []);

  const reset = useCallback(() => setAnswers({}), []);

  const toSubmitArray = useMemo(() => {
    return Object.entries(answers)
      .filter(([, v]) => typeof v !== 'undefined')
      .map(([question_id, value]) => ({ question_id, value }));
  }, [answers]);

  return { answersById: answers, setAnswer, clearAnswers, reset, toSubmitArray };
}
