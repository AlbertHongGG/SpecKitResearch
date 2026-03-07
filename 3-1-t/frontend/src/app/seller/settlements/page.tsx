'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { sellerSettlementsApi } from '@/services/seller/settlements/api';

export default function SellerSettlementsPage() {
  const { data } = useQuery({
    queryKey: ['seller-settlements'],
    queryFn: sellerSettlementsApi.list,
  });
  const settlements =
    (data as Array<{ id: string; status: string; netCents: number }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Settlements</h1>
      <ul className="space-y-2">
        {settlements.map((settlement) => (
          <li key={settlement.id} className="rounded border p-3">
            <Link href={`/seller/settlements/${settlement.id}`}>{settlement.id}</Link> ·{' '}
            {settlement.status} · ${(settlement.netCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
    </main>
  );
}
