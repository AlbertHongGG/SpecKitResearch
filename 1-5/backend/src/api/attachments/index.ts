import type { FastifyInstance } from 'fastify';

import { registerUploadDraftAttachmentRoute } from './uploadDraftAttachment.js';

export async function registerAttachmentsRoutes(app: FastifyInstance): Promise<void> {
  await registerUploadDraftAttachmentRoute(app);
}
