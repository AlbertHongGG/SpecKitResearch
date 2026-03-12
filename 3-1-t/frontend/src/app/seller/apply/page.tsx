'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { useSession } from '@/services/auth/useSession';
import { sellerApplicationsApi } from '@/services/seller/applications/api';

export default function SellerApplyPage() {
  const { data: session } = useSession();
  const { data, refetch } = useQuery({
    queryKey: ['seller-status'],
    queryFn: sellerApplicationsApi.status,
  });
  const submit = useMutation({
    mutationFn: () => sellerApplicationsApi.submit(),
    onSuccess: () => refetch(),
  });
  const status = (data as { status?: string } | null)?.status;
  const alreadySeller = session?.user?.roles.includes('SELLER');

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Application</h1>
      <p>Status: {status ?? 'N/A'}</p>
      {alreadySeller ? (
        <p className="text-sm text-black/70">
          Your account already has seller access. Go to{' '}
          <Link className="underline" href="/seller/products">
            seller products
          </Link>
          .
        </p>
      ) : null}
      <Button onClick={() => submit.mutate()} loading={submit.isPending}>
        Submit application
      </Button>
    </main>
  );
}
