'use client';

import { useEffect } from 'react';
import { ErrorState } from '../components/states/ErrorState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="mx-auto max-w-2xl p-6">
          <ErrorState title="發生錯誤" message={error.message} onRetry={reset} />
        </div>
      </body>
    </html>
  );
}
