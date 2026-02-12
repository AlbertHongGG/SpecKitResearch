import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveRequestForm } from './LeaveRequestForm';
import { renderWithProviders } from '../../../test/test-utils';

vi.mock('../../lib/apiClient', () => {
    return {
        apiFetch: vi.fn(async (path: string) => {
            if (path === '/leave-types') {
                return {
                    items: [
                        { id: '00000000-0000-0000-0000-000000000001', name: '年假', requireAttachment: false, isActive: true },
                        { id: '00000000-0000-0000-0000-000000000002', name: '病假', requireAttachment: true, isActive: true },
                    ],
                };
            }
            throw new Error(`Unhandled path: ${path}`);
        }),
    };
});

describe('LeaveRequestForm', () => {
    it('shows validation error when leaveTypeId missing', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn(async () => undefined);

        renderWithProviders(<LeaveRequestForm onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: '儲存草稿' }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });

    it('shows attachment required hint for leave types requiring it', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn(async () => undefined);

        renderWithProviders(<LeaveRequestForm onSave={onSave} />);

        // wait leave types options
        await screen.findByRole('option', { name: '病假' });
        await user.selectOptions(screen.getByRole('combobox'), '00000000-0000-0000-0000-000000000002');

        expect(screen.getByText(/附件（必填）/)).toBeInTheDocument();
        expect(screen.getByText('此假別需要附件')).toBeInTheDocument();
    });
});
