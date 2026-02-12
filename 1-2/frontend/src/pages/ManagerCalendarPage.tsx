import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DatesSetArg } from '@fullcalendar/core';
import { useManagerCalendar } from '../features/calendar/useManagerCalendar';
import { calendarEventClassNames } from '../features/calendar/calendarEventRender';

function formatDateOnlyUtc(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

function addDaysUtc(dateStr: string, days: number) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function ManagerCalendarPage() {
    const navigate = useNavigate();
    const [view, setView] = useState<'month' | 'week'>('month');
    const [includeSubmitted, setIncludeSubmitted] = useState(false);
    const [range, setRange] = useState<{ start: string; end: string }>({
        start: formatDateOnlyUtc(new Date()),
        end: formatDateOnlyUtc(new Date()),
    });

    const q = useManagerCalendar({ view, start: range.start, end: range.end, includeSubmitted });

    const events = useMemo(() => {
        return (
            q.data?.map((e) => ({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                allDay: true,
                extendedProps: {
                    status: e.status,
                    leaveRequestId: e.leaveRequestId,
                    employee: e.employee,
                },
            })) ?? []
        );
    }, [q.data]);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ marginRight: 'auto' }}>日曆</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={includeSubmitted} onChange={(e) => setIncludeSubmitted(e.target.checked)} />
                    顯示 submitted
                </label>
            </div>

            {q.isError ? <div style={{ color: 'crimson', marginBottom: 8 }}>Failed to load calendar</div> : null}

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek',
                }}
                views={{
                    dayGridMonth: { titleFormat: { year: 'numeric', month: 'short' } },
                }}
                datesSet={(arg: DatesSetArg) => {
                    const start = formatDateOnlyUtc(arg.start);
                    const endExclusive = formatDateOnlyUtc(arg.end);
                    const endInclusive = addDaysUtc(endExclusive, -1);

                    setView(arg.view.type === 'timeGridWeek' ? 'week' : 'month');
                    setRange({ start, end: endInclusive });
                }}
                events={events}
                eventClassNames={calendarEventClassNames}
                eventClick={(arg) => {
                    const leaveRequestId = (arg.event.extendedProps as any)?.leaveRequestId as string | undefined;
                    if (leaveRequestId) navigate(`/manager/leave-requests/${leaveRequestId}`);
                }}
                height="auto"
            />
        </div>
    );
}
