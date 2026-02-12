import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export type CalendarEvent = {
    id: string;
    leaveRequestId: string;
    title: string;
    start: string;
    end: string;
    allDay?: boolean;
    status: 'submitted' | 'approved';
    employee: { name: string; departmentName: string };
};

export function useManagerCalendar(args: { view: 'month' | 'week'; start: string; end: string; includeSubmitted: boolean }) {
    return useQuery({
        queryKey: ['manager', 'calendar', args],
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('view', args.view);
            qs.set('start', args.start);
            qs.set('end', args.end);
            if (args.includeSubmitted) qs.set('includeSubmitted', 'true');

            const res = await apiFetch<{ items: CalendarEvent[] }>(`/manager/calendar?${qs.toString()}`);
            return res.items;
        },
        enabled: Boolean(args.start && args.end),
    });
}
