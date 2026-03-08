import { getPrisma } from '../lib/db.js';

export async function appendWebhookLog(input: {
  orderId: string;
  replayRunId?: string | null;
  webhookEndpointId?: string | null;
  url: string;
  eventId: string;
  signatureTimestamp: number;
  signatureHeader: string;
  requestHeaders: Record<string, string>;
  payload: any;
  durationMs: number | null;
  responseStatus: number | null;
  responseBodyExcerpt: string | null;
  success: boolean;
  errorSummary: string | null;
}) {
  const prisma = getPrisma();
  return prisma.webhookLog.create({
    data: {
      orderId: input.orderId,
      replayRunId: input.replayRunId ?? null,
      webhookEndpointId: input.webhookEndpointId ?? null,
      url: input.url,
      eventId: input.eventId,
      signatureTimestamp: input.signatureTimestamp,
      signatureHeader: input.signatureHeader,
      requestHeaders: input.requestHeaders,
      payload: input.payload,
      sentAt: new Date(),
      durationMs: input.durationMs,
      responseStatus: input.responseStatus,
      responseBodyExcerpt: input.responseBodyExcerpt,
      success: input.success,
      errorSummary: input.errorSummary,
    },
  });
}
