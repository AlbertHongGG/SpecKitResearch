import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';

export type DepartmentCalendarStatus = 'approved' | 'submitted';

export interface DepartmentCalendarEvent {
  leave_request_id: string;
  employee: { id: string; name: string };
  start_date: string;
  end_date: string;
  days: number;
  status: DepartmentCalendarStatus;
}

export function useDepartmentCalendar(month: string, includeSubmitted: boolean) {
  const params = new URLSearchParams();
  params.set('month', month);
  if (includeSubmitted) params.set('includeSubmitted', 'true');

  return useQuery({
    queryKey: ['department-calendar', month, includeSubmitted],
    queryFn: async () => apiRequest<DepartmentCalendarEvent[]>(`/department-calendar?${params.toString()}`),
  });
}
