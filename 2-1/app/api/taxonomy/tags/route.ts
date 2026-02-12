import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listActiveTags } from '@/services/taxonomyRepo';

export const GET = withErrorHandling(async () => {
  const tags = await listActiveTags();
  return ok({
    tags: tags.map((t) => ({ tagId: t.id, name: t.name })),
  });
});
