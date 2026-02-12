import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/server/export/csv';

describe('toCsv', () => {
  it('writes header and rows with trailing newline', () => {
    const csv = toCsv(
      [
        { date: '2026-02-01', note: 'hello', amount: 123 },
        { date: '2026-02-02', note: '', amount: 0 },
      ],
      ['date', 'note', 'amount'],
    );

    expect(csv).toBe('date,note,amount\n2026-02-01,hello,123\n2026-02-02,,0\n');
  });

  it('escapes quotes, commas, and newlines', () => {
    const csv = toCsv([{ note: 'a,"b"\nc', empty: null }], ['note', 'empty']);
    expect(csv).toBe('note,empty\n"a,""b""\nc",\n');
  });
});
