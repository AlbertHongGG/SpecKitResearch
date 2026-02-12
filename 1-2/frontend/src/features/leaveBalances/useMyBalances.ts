import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export type LeaveBalance = {
    id: string;
    leaveType: { id: string; name: string; annualQuota: number; carryOver: boolean; requireAttachment: boolean; isActive: boolean };
    year: number;
    quota: number;
    usedDays: number;
    reservedDays: number;
};

export function useMyBalances(year: number) {
    return useQuery({
        queryKey: ['me', 'leave-balances', year],
        queryFn: async () => {
            const res = await apiFetch<{ items: LeaveBalance[] }>(`/me/leave-balances?year=${year}`);
            return res.items;
        },
    });
}
