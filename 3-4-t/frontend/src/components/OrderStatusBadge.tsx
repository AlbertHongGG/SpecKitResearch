import type { OrderStatus } from '@app/contracts';

const COLOR: Record<OrderStatus, string> = {
  created: 'bg-slate-100 text-slate-700',
  payment_pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-zinc-200 text-zinc-800',
  timeout: 'bg-purple-100 text-purple-800',
};

export function OrderStatusBadge(props: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${COLOR[props.status]}`}>
      {props.status}
    </span>
  );
}
