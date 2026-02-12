import { apiFetchJson, ApiError } from '@/lib/api/client';

export async function submitResponse(
  slug: string,
  payload: { answers: Array<{ question_id: string; value: unknown }> },
  csrfToken?: string
) {
  try {
    const data = await apiFetchJson<{ response: { response_id: string; publish_hash: string; response_hash: string } }>(
      `/s/${encodeURIComponent(slug)}/responses`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      { csrfToken }
    );
    return data.response;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    throw e;
  }
}
