import { DocumentStatus, DocumentVersionKind } from '@prisma/client';
import { stateNotAllowed, validationFailed } from '../lib/httpError.js';

export type DocumentLike = {
  id: string;
  status: DocumentStatus;
  currentVersion?: { id: string; kind: DocumentVersionKind } | null;
};

export type DocumentTransition = {
  from: DocumentStatus;
  to: DocumentStatus;
};

const LEGAL_TRANSITIONS: ReadonlyArray<DocumentTransition> = [
  { from: DocumentStatus.Draft, to: DocumentStatus.Submitted },
  { from: DocumentStatus.Submitted, to: DocumentStatus.InReview },
  { from: DocumentStatus.InReview, to: DocumentStatus.Rejected },
  { from: DocumentStatus.InReview, to: DocumentStatus.Approved },
  { from: DocumentStatus.Rejected, to: DocumentStatus.Draft },
  { from: DocumentStatus.Approved, to: DocumentStatus.Archived },
];

export function assertLegalTransition(from: DocumentStatus, to: DocumentStatus) {
  const ok = LEGAL_TRANSITIONS.some((t) => t.from === from && t.to === to);
  if (!ok) {
    throw stateNotAllowed('Illegal document status transition', { from, to });
  }
}

export function assertDraft(document: DocumentLike) {
  if (document.status !== DocumentStatus.Draft) {
    throw stateNotAllowed('Document is not Draft', { documentId: document.id, status: document.status });
  }
}

export function assertNotDraft(document: DocumentLike) {
  if (document.status === DocumentStatus.Draft) {
    throw stateNotAllowed('Document is Draft', { documentId: document.id, status: document.status });
  }
}

export function assertCurrentVersionKind(document: DocumentLike, kind: DocumentVersionKind) {
  const currentKind = document.currentVersion?.kind;
  if (!currentKind) {
    throw validationFailed('Document current version not loaded', { documentId: document.id });
  }
  if (currentKind !== kind) {
    throw stateNotAllowed('Unexpected current version kind', {
      documentId: document.id,
      expected: kind,
      actual: currentKind,
    });
  }
}

export function assertCanUpdateDraft(document: DocumentLike) {
  assertDraft(document);
  assertCurrentVersionKind(document, DocumentVersionKind.Draft);
}

export function assertCanUploadDraftAttachment(document: DocumentLike) {
  assertDraft(document);
  assertCurrentVersionKind(document, DocumentVersionKind.Draft);
}

export function assertCanSubmit(document: DocumentLike) {
  assertDraft(document);
  assertCurrentVersionKind(document, DocumentVersionKind.Draft);
}

export function assertCanArchive(document: DocumentLike) {
  if (document.status !== DocumentStatus.Approved) {
    throw stateNotAllowed('Only Approved documents can be archived', {
      documentId: document.id,
      status: document.status,
    });
  }
}
