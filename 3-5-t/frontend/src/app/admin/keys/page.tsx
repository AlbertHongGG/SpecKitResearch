'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export default function AdminKeysPage() {
  const [keyId, setKeyId] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Keys actions</h1>
      <div className="rounded border p-4 space-y-2">
        <Input
          aria-label="Key ID"
          placeholder="key id"
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" onClick={() => apiFetch(`/admin/keys/${keyId}/block`, { method: 'POST' })}>
            Block
          </Button>
          <Button type="button" onClick={() => apiFetch(`/admin/keys/${keyId}/revoke`, { method: 'POST' })}>
            Revoke
          </Button>
        </div>
      </div>
    </div>
  );
}
