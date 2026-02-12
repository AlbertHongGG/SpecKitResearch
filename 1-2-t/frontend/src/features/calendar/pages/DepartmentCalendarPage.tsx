import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { addDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useDepartmentCalendar } from '../api/useDepartmentCalendar';
import { CalendarLegend } from '../components/CalendarLegend';
import { getApiErrorMessage } from '../../../api/errorHandling';

function monthString(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function DepartmentCalendarPage() {
  const nav = useNavigate();
  const [month, setMonth] = useState(() => monthString(new Date()));
  const [includeSubmitted, setIncludeSubmitted] = useState(false);

  const q = useDepartmentCalendar(month, includeSubmitted);

  const events = useMemo(() => {
    const rows = q.data ?? [];
    return rows.map((r) => ({
      id: r.leave_request_id,
      title: `${r.employee.name} (${r.status})`,
      start: r.start_date,
      end: format(addDays(new Date(r.end_date + 'T00:00:00Z'), 1), 'yyyy-MM-dd'),
      allDay: true,
      backgroundColor: r.status === 'approved' ? '#10b981' : '#f59e0b',
      borderColor: r.status === 'approved' ? '#10b981' : '#f59e0b',
    }));
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">部門請假日曆</h1>
        <p className="mt-1 text-sm text-slate-600">顯示直屬部屬的請假事件。</p>
      </div>

      <CalendarLegend includeSubmitted={includeSubmitted} onToggle={setIncludeSubmitted} />

      {q.isError ? <div className="text-sm text-red-600">{getApiErrorMessage(q.error)}</div> : null}

      <div className="rounded border bg-white p-2">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          datesSet={(arg) => {
            setMonth(monthString(arg.start));
          }}
          eventClick={(arg) => {
            const id = arg.event.id;
            if (id) nav(`/leave-requests/${id}`);
          }}
          height="auto"
        />
      </div>

      {q.isLoading ? <div className="text-sm text-slate-600">載入中…</div> : null}
    </div>
  );
}
