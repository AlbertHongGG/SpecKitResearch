import { AppError } from '@/lib/errors/AppError';

// Basic same-origin guard for state-changing requests.
export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origin || !host) {
    // If missing, rely on SameSite cookie; keep permissive but safe.
    return;
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      throw AppError.forbidden('跨站請求被拒絕');
    }
  } catch {
    throw AppError.forbidden('跨站請求被拒絕');
  }
}
