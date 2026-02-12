import { calendarEventClassNames } from './calendarEventRender';

describe('calendarEventClassNames', () => {
    it('adds submitted class', () => {
        const classes = calendarEventClassNames({ event: { extendedProps: { status: 'submitted' } } });
        expect(classes).toEqual(['evt-submitted']);
    });

    it('adds approved class', () => {
        const classes = calendarEventClassNames({ event: { extendedProps: { status: 'approved' } } });
        expect(classes).toEqual(['evt-approved']);
    });
});
