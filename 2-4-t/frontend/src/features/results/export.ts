'use client';

import { exportResponses } from './api';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadExport(surveyId: string, slug: string, publishHash: string, format: 'json' | 'csv') {
  const res = await exportResponses(surveyId, format);
  const safeHash = publishHash.slice(0, 12);
  const base = `${slug}-${safeHash}-export`;

  if (res.export.format === 'csv' && typeof res.export.rows === 'string') {
    downloadBlob(`${base}.csv`, new Blob([res.export.rows], { type: 'text/csv;charset=utf-8' }));
    return;
  }

  downloadBlob(`${base}.json`, new Blob([JSON.stringify(res.export.rows, null, 2)], { type: 'application/json' }));
}
