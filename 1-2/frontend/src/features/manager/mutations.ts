import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveLeaveRequest, rejectLeaveRequest } from './api';

export function useManagerApproveMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: approveLeaveRequest,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['manager', 'pending'] });
            await qc.invalidateQueries({ queryKey: ['manager', 'calendar'] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] });
        },
    });
}

export function useManagerRejectMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; reason: string }) => rejectLeaveRequest(args.id, args.reason),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['manager', 'pending'] });
            await qc.invalidateQueries({ queryKey: ['manager', 'calendar'] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] });
        },
    });
}
