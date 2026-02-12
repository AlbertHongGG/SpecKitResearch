import { logger } from './logger';

export function logEvent(name: string, meta?: Record<string, unknown>) {
  logger.info(`event:${name}`, meta);
}

export function logSurveyPublished(meta: { survey_id: string; owner_user_id: string; publish_hash: string }) {
  logEvent('survey_published', meta);
}

export function logSurveyClosed(meta: { survey_id: string; owner_user_id: string }) {
  logEvent('survey_closed', meta);
}

export function logResponseSubmitted(meta: { survey_id: string; response_id: string; publish_hash: string }) {
  logEvent('response_submitted', meta);
}

export function logResponsesExported(meta: { survey_id: string; owner_user_id: string; format: string; count: number }) {
  logEvent('responses_exported', meta);
}
