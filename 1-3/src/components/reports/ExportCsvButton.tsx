'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { downloadFromUrl } from '@/lib/shared/download';
import { toast } from '@/lib/shared/toast';

export function ExportCsvButton({ year, month }: { year: number; month: number }) {
  const [loading, setLoading] = useState(false);

  async function onExport() {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ year: String(year), month: String(month) });
      await downloadFromUrl({
        url: `/api/reports/monthly/export?${sp.toString()}`,
        filename: `transactions_${year}_${String(month).padStart(2, '0')}.csv`,
      });
      toast.success('已開始下載 CSV');
    } catch (err) {
      toast.error((err as any)?.message ?? '匯出失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={onExport} disabled={loading}>
      {loading ? '匯出中…' : '匯出 CSV'}
    </Button>
  );
}
