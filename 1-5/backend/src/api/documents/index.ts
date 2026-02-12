import type { FastifyInstance } from 'fastify';

import { registerListDocumentsRoute } from './listDocuments.js';
import { registerCreateDocumentRoute } from './createDocument.js';
import { registerGetDocumentDetailRoute } from './getDocumentDetail.js';
import { registerUpdateDraftRoute } from './updateDraft.js';
import { registerSubmitDocumentRoute } from './submitDocument.js';
import { registerArchiveDocumentRoute } from './archiveDocument.js';

export async function registerDocumentsRoutes(app: FastifyInstance): Promise<void> {
  await registerListDocumentsRoute(app);
  await registerCreateDocumentRoute(app);
  await registerGetDocumentDetailRoute(app);
  await registerUpdateDraftRoute(app);
  await registerSubmitDocumentRoute(app);
  await registerArchiveDocumentRoute(app);
}

