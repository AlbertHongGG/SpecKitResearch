'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { adminRefundsApi } from '@/services/admin/refunds/api';

export default function AdminRefundsPage() {
  const guard = useRolePageGuard('ADMIN');
  const { data, refetch } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: adminRefundsApi.list,
  });
  const refunds =
    (data as
      | Array<{
          id: string;
          status: string;
          requestedCents?: number;
          approvedCents?: number | null;
          reason?: string;
          buyer?: { email?: string };
          subOrder?: { id?: string; status?: string };
        }>
      | undefined) ?? [];
  const [approvedAmounts, setApprovedAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Refunds</h1>
      {message ? <p className="text-sm text-black/70">{message}</p> : null}
      <ul className="space-y-2">
        {refunds.map((item) => (
          <li key={item.id} className="rounded border p-3">
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                {item.id} · {item.status}
              </div>
              <div>Buyer: {item.buyer?.email ?? 'Unknown'}</div>
              <div>
                SubOrder: {item.subOrder?.id ?? 'Unknown'} · {item.subOrder?.status ?? 'Unknown'}
              </div>
              <div>Reason: {item.reason ?? 'N/A'}</div>
              <div>
                Requested: ${(item.requestedCents ?? 0) / 100}
                {item.approvedCents != null ? ` · Approved: $${item.approvedCents / 100}` : ''}
              </div>
            </div>
            <div className="mt-3 max-w-xs">
              <Input
                label="Approved Amount (cents)"
                onChange={(event) =>
                  setApprovedAmounts((current) => ({ ...current, [item.id]: event.target.value }))
                }
                type="number"
                value={approvedAmounts[item.id] ?? String(item.requestedCents ?? '')}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={async () => {
                  await adminRefundsApi.approve(
                    item.id,
                    Number(approvedAmounts[item.id] ?? item.requestedCents ?? 0),
                  );
                  await refetch();
                  setMessage(`Approved refund ${item.id}.`);
                }}
              >
                Approve
              </Button>
              <Button
                className="bg-white text-black border border-black"
                onClick={async () => {
                  await adminRefundsApi.reject(item.id);
                  await refetch();
                  setMessage(`Rejected refund ${item.id}.`);
                }}
              >
                Reject
              </Button>
              <Button
                className="bg-neutral-700"
                onClick={async () => {
                  await adminRefundsApi.forceRefund(
                    item.id,
                    Number(approvedAmounts[item.id] ?? item.requestedCents ?? 0),
                  );
                  await refetch();
                  setMessage(`Force refunded ${item.id}.`);
                }}
              >
                Force Refund
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
