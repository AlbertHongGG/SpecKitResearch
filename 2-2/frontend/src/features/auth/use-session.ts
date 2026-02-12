'use client';

import { useAuthContext } from './auth-context';

export function useSession() {
  return useAuthContext();
}
