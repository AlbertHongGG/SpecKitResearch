'use client';

import type { Question } from '@acme/contracts';

export function SurveyStepper(props: {
  visibleQuestions: Question[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const total = props.visibleQuestions.length;
  const current = total === 0 ? 0 : props.activeIndex + 1;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-zinc-600">
        {total === 0 ? 'No visible questions' : `Question ${current} / ${total}`}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={props.onPrev}
          disabled={!props.canPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={props.onNext}
          disabled={!props.canNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
