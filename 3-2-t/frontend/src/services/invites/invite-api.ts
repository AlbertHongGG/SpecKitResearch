import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export async function acceptInvite(token: string) {
  const response = await fetch(`${API_BASE_URL}/invites/${token}/accept`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as {
    organizationId: string;
    organizationName: string;
  };
}
