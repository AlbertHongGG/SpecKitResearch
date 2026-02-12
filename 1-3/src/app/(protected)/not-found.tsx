import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProtectedNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">找不到頁面</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">你要找的頁面不存在或已被移除。</p>
          <Link href="/transactions">
            <Button>回到帳務</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
