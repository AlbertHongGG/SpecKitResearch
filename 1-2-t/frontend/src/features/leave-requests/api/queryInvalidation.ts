import type { QueryClient } from '@tanstack/react-query';

export async function invalidateLeaveRequestRelated(qc: QueryClient, id?: string) {
  await qc.invalidateQueries({ queryKey: ['my-leave-requests'] });
  await qc.invalidateQueries({ queryKey: ['pending-approvals'] });
  await qc.invalidateQueries({ queryKey: ['leave-balance'] });

  if (id) {
    await qc.invalidateQueries({ queryKey: ['leave-request', id] });
  }
}
