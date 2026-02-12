'use client';

import { useState } from 'react';

import { Button } from '../../Button';
import { Input } from '../../Input';

export function NameForm(params: {
  initialName?: string;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(params.initialName ?? '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || params.disabled) return;
    setBusy(true);
    try {
      await params.onSubmit(name);
      if (!params.initialName) setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={name} disabled={busy || params.disabled} onChange={(e) => setName(e.target.value)} placeholder="名稱" />
      <Button type="button" variant="secondary" disabled={busy || params.disabled} onClick={() => void submit()}>
        {params.submitLabel}
      </Button>
    </div>
  );
}
