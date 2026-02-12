'use client';

import { useCallback, useState } from 'react';

export function useSingleFlight() {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (busy) return undefined;
      setBusy(true);
      try {
        return await fn();
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return { busy, run };
}

export async function optimistic<T>(params: {
  apply: () => void;
  rollback: () => void;
  commit?: () => void;
  run: () => Promise<T>;
}): Promise<T> {
  params.apply();
  try {
    const result = await params.run();
    params.commit?.();
    return result;
  } catch (e) {
    params.rollback();
    throw e;
  }
}
