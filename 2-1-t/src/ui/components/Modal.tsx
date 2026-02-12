'use client';

import { useEffect } from 'react';

import { Button } from './Button';

export function Modal(params: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!params.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') params.onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [params]);

  if (!params.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{params.title}</div>
          <Button type="button" variant="secondary" onClick={params.onClose}>
            關閉
          </Button>
        </div>
        <div className="mt-3">{params.children}</div>
      </div>
    </div>
  );
}
