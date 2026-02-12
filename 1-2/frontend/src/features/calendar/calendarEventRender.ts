export function calendarEventClassNames(arg: any) {
    const status = (arg.event.extendedProps as any)?.status as string | undefined;
    if (status === 'submitted') return ['evt-submitted'];
    if (status === 'approved') return ['evt-approved'];
    return [];
}
