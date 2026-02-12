function escapeCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export type CsvRow = Record<string, string | number | null | undefined>;

export function toCsv(rows: CsvRow[], headers: string[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(','));

  for (const row of rows) {
    const line = headers
      .map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        return escapeCell(String(v));
      })
      .join(',');
    lines.push(line);
  }

  return lines.join('\n') + '\n';
}
