"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

export function useAppSummary() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['app-summary', organizationId],
    queryFn: () => apiFetch('/app/summary', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useSubscription() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => apiFetch('/subscriptions/current', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useInvoices() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: () => apiFetch('/invoices', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useUsage() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['usage', organizationId],
    queryFn: () => apiFetch('/usage', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}

export function usePaymentMethods() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['payment-methods', organizationId],
    queryFn: () => apiFetch('/payment-methods', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useMembers() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['members', organizationId],
    queryFn: () => apiFetch('/org/members', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}
