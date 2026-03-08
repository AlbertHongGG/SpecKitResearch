import { useMutation, useQuery } from '@tanstack/react-query';
import type { OrdersCreateRequest } from '@app/contracts';
import {
  OrdersCreateResponseSchema as OrdersCreateResponseZod,
  OrdersListResponseSchema as OrdersListResponseZod,
  OrderDetailSchema as OrderDetailZod,
  PayPagePayResponseSchema as PayPagePayResponseZod,
} from '@app/contracts';
import { apiFetch } from './http';

export function useOrdersListQuery(params: {
  page: number;
  pageSize: number;
  status?: string;
  paymentMethod?: string;
  scenario?: string;
}) {
  return useQuery({
    queryKey: ['orders', 'list', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(params.page));
      sp.set('page_size', String(params.pageSize));
      if (params.status) sp.set('status', params.status);
      if (params.paymentMethod) sp.set('payment_method', params.paymentMethod);
      if (params.scenario) sp.set('simulation_scenario', params.scenario);

      const res = await apiFetch<unknown>(`/api/orders?${sp.toString()}`);
      return OrdersListResponseZod.parse(res.data);
    },
  });
}

export function useOrderDetailQuery(id: string) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiFetch<unknown>(`/api/orders/${id}`);
      return OrderDetailZod.parse(res.data);
    },
  });
}

export function usePayPageLoadQuery(orderNo: string) {
  return useQuery({
    queryKey: ['pay', 'load', orderNo],
    enabled: Boolean(orderNo),
    queryFn: async () => {
      const res = await apiFetch<unknown>(`/api/pay/${orderNo}`);
      return OrderDetailZod.parse(res.data);
    },
  });
}

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: async (input: OrdersCreateRequest) => {
      const res = await apiFetch<unknown>(`/api/orders`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return OrdersCreateResponseZod.parse(res.data);
    },
  });
}

export function usePayMutation(orderNo: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch<unknown>(`/api/pay/${orderNo}`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      return PayPagePayResponseZod.parse(res.data);
    },
  });
}
