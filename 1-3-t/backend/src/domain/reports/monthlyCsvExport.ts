import { prisma } from '../../infra/db/prisma';
import { formatDateOnly } from '../transactions/transactionRules';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getMonthRange(args: { year: number; month: number }) {
  const start = new Date(`${args.year}-${pad2(args.month)}-01`);

  const nextMonth = args.month === 12 ? 1 : args.month + 1;
  const nextYear = args.month === 12 ? args.year + 1 : args.year;
  const end = new Date(`${nextYear}-${pad2(nextMonth)}-01`);

  return { start, end };
}

function escapeCsvCell(value: string) {
  if (value.includes('"')) value = value.replaceAll('"', '""');

  // Wrap in quotes if it contains a delimiter or quote or newline.
  if (/[",\r\n]/.test(value)) {
    return `"${value}"`;
  }

  return value;
}

export function makeMonthlyCsvFilename(args: { year: number; month: number }) {
  return `transactions_${args.year}_${pad2(args.month)}.csv`;
}

export async function exportMonthlyTransactionsCsv(args: {
  userId: string;
  year: number;
  month: number;
}): Promise<{ filename: string; csv: string; rowCount: number }> {
  const { start, end } = getMonthRange({ year: args.year, month: args.month });

  const rows = await prisma.transaction.findMany({
    where: {
      userId: args.userId,
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: {
      date: true,
      type: true,
      amount: true,
      note: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const header = ['日期', '類型', '類別', '金額', '備註'];
  const lines: string[] = [header.join(',')];

  for (const r of rows) {
    const cols = [
      formatDateOnly(r.date),
      r.type,
      r.category.name,
      String(r.amount),
      r.note ?? '',
    ].map(escapeCsvCell);

    lines.push(cols.join(','));
  }

  const bom = '\ufeff';
  const csv = bom + lines.join('\r\n') + '\r\n';

  return {
    filename: makeMonthlyCsvFilename({ year: args.year, month: args.month }),
    csv,
    rowCount: rows.length,
  };
}
