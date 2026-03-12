'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export default function AdminUsersPage() {
  const [userId, setUserId] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users actions</h1>
      <div className="rounded border p-4 space-y-2">
        <Input
          aria-label="User ID"
          placeholder="user id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Button type="button" onClick={() => apiFetch(`/admin/users/${userId}/disable`, { method: 'POST' })}>
          Disable user
        </Button>
      </div>
    </div>
  );
}
