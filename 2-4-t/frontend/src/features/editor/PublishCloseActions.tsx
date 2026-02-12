'use client';

import { useRouter } from 'next/navigation';
import type { SurveyStatus } from '@app/contracts';
import { useCloseSurvey, usePublishSurvey } from '@/features/surveys/api';

export function PublishCloseActions(props: {
  surveyId: string;
  status: SurveyStatus;
  csrfToken?: string;
  canPublish: boolean;
}) {
  const router = useRouter();
  const publish = usePublishSurvey(props.surveyId, props.csrfToken);
  const close = useCloseSurvey(props.surveyId, props.csrfToken);

  const isDraft = props.status === 'DRAFT';
  const isPublished = props.status === 'PUBLISHED';
  const isClosed = props.status === 'CLOSED';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded border px-3 py-1 disabled:opacity-50"
        disabled={!props.csrfToken || !isDraft || !props.canPublish || publish.isPending}
        onClick={async () => {
          await publish.mutateAsync();
        }}
        title={!props.canPublish ? 'Fix draft validation errors before publishing' : undefined}
      >
        {publish.isPending ? 'Publishing…' : 'Publish'}
      </button>

      <button
        className="rounded border px-3 py-1 disabled:opacity-50"
        disabled={!props.csrfToken || !isPublished || close.isPending}
        onClick={async () => {
          await close.mutateAsync();
        }}
      >
        {close.isPending ? 'Closing…' : isClosed ? 'Closed' : 'Close'}
      </button>

      <button
        className="rounded border px-3 py-1 disabled:opacity-50"
        disabled={isDraft}
        onClick={() => router.push(`/surveys/${props.surveyId}/results`)}
      >
        Results
      </button>
    </div>
  );
}
