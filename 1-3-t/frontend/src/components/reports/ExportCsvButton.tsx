import { useState } from 'react';

import { downloadMonthlyCsv } from '../../services/reports';
import { toUserFacingMessage } from '../../services/apiErrors';
import { useToast } from '../ToastProvider';

export function ExportCsvButton(props: { year: number; month: number; disabled: boolean }) {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  return (
    <button
      type="button"
      className={
        props.disabled
          ? 'rounded border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400'
          : 'rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800'
      }
      disabled={props.disabled || isExporting}
      onClick={async () => {
        if (props.disabled || isExporting) return;

        setIsExporting(true);
        try {
          const { filename, blob } = await downloadMonthlyCsv({ year: props.year, month: props.month });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          toast.push({ type: 'error', message: toUserFacingMessage(err) });
        } finally {
          setIsExporting(false);
        }
      }}
    >
      {isExporting ? '匯出中…' : '匯出 CSV'}
    </button>
  );
}
