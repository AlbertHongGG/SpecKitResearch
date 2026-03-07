'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { sellerApplicationsApi } from '@/services/seller/applications/api';

export default function SellerApplyPage() {
  const { data, refetch } = useQuery({
    queryKey: ['seller-status'],
    queryFn: sellerApplicationsApi.status,
  });
  const submit = useMutation({
    mutationFn: () => sellerApplicationsApi.submit(),
    onSuccess: () => refetch(),
  });
  const status = (data as { status?: string } | null)?.status;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Application</h1>
      <p>Status: {status ?? 'N/A'}</p>
      <Button onClick={() => submit.mutate()} loading={submit.isPending}>
        Submit application
      </Button>
    </main>
  );
}
