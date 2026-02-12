import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelLeaveRequest, createDraft, submitLeaveRequest, updateDraft } from './api';

export function useSaveDraftMutation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (args: { id?: string; input: Parameters<typeof createDraft>[0] }) => {
            if (args.id) return updateDraft(args.id, args.input);
            return createDraft(args.input);
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['me', 'leave-requests'] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] });
        },
    });
}

export function useSubmitMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: submitLeaveRequest,
        onSuccess: async (_data, id) => {
            await qc.invalidateQueries({ queryKey: ['me', 'leave-requests'] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-requests', id] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] });
        },
    });
}

export function useCancelMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: cancelLeaveRequest,
        onSuccess: async (_data, id) => {
            await qc.invalidateQueries({ queryKey: ['me', 'leave-requests'] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-requests', id] });
            await qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] });
        },
    });
}
