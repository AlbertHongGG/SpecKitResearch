import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { listActiveCategories } from '@/services/taxonomyRepo';

export const GET = withErrorHandling(async () => {
  const categories = await listActiveCategories();
  return ok({
    categories: categories.map((c) => ({ categoryId: c.id, name: c.name })),
  });
});
