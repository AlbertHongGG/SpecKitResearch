'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { sellerSettlementsApi } from '@/services/seller/settlements/api';

export default function SellerSettlementDetailPage() {
  const params = useParams<{ settlementId: string }>();
  const settlementId = params.settlementId;

  const { data } = useQuery({
    queryKey: ['seller-settlement', settlementId],
    queryFn: () => sellerSettlementsApi.detail(settlementId),
  });

  const settlement = data as
    | { id?: string; status?: string; grossCents?: number; netCents?: number }
    | undefined;

  return (
    <main className="mx-auto max-w-4xl space-y-3 px-6 py-10">
      <h1 className="text-2xl font-semibold">Settlement {settlement?.id}</h1>
      <p>Status: {settlement?.status}</p>
      <p>Gross: ${((settlement?.grossCents ?? 0) / 100).toFixed(2)}</p>
      <p>Net: ${((settlement?.netCents ?? 0) / 100).toFixed(2)}</p>
    </main>
  );
}
