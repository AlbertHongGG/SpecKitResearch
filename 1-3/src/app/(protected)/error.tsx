'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Let our server-side logging handle most details; keep client output minimal.
    // eslint-disable-next-line no-console
    console.error('Protected route error', error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">發生錯誤</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50 text-red-700">頁面載入失敗，請稍後再試。</Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>重試</Button>
            <Link href="/transactions">
              <Button variant="secondary">回到帳務</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
