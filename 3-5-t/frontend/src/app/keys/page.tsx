'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiFetch } from '../../lib/api';
import { KeysListSchema } from '../../lib/schemas';
import { Loading } from '../../components/states/Loading';
import { Alert } from '../../components/ui/Alert';
import { CreateKeyForm } from '../../components/keys/CreateKeyForm';
import { ShowOnceKeyDialog } from '../../components/keys/ShowOnceKeyDialog';
import { KeyActions } from '../../components/keys/KeyActions';

export default function KeysPage() {
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => KeysListSchema.parse(await apiFetch('/keys')),
  });

  if (isLoading) return <Loading />;
  if (error) return <Alert title="載入失敗">{(error as any)?.message}</Alert>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">API Keys</h1>
      <CreateKeyForm onCreated={(k) => setPlainKey(k)} />

      <div className="rounded border">
        <div className="grid grid-cols-6 gap-2 border-b p-3 text-xs font-semibold text-gray-600">
          <div className="col-span-2">Name</div>
          <div>Status</div>
          <div>Last4</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        {data?.keys.map((k) => (
          <div key={k.id} className="grid grid-cols-6 gap-2 p-3 text-sm">
            <div className="col-span-2">
              <div className="font-medium">{k.name}</div>
              <Link className="text-xs text-blue-600" href={`/keys/${k.id}/usage`}>
                usage
              </Link>
            </div>
            <div>{String(k.status).toUpperCase()}</div>
            <div>****{k.secretLast4}</div>
            <div className="text-xs">{new Date(k.createdAt).toLocaleString()}</div>
            <div>
              <KeyActions keyItem={k} onRotated={(pk) => setPlainKey(pk)} />
            </div>
          </div>
        ))}
        {data?.keys.length === 0 ? <div className="p-3 text-sm text-gray-600">No keys</div> : null}
      </div>

      {plainKey ? <ShowOnceKeyDialog plainKey={plainKey} onClose={() => setPlainKey(null)} /> : null}
    </div>
  );
}
