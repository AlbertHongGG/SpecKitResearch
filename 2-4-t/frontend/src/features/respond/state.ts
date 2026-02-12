export type RespondFlowState =
  | { tag: 'Answering' }
  | { tag: 'Submitting' }
  | { tag: 'Completion'; responseId: string; publishHash: string; responseHash: string };
