import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../../test/test-utils';
import { LeaveRequestDetailPage } from '../../pages/LeaveRequestDetailPage';

const mutate = vi.fn();

vi.mock('./mutations', () => {
    return {
        useSubmitMutation: () => ({ mutate, isPending: false, isError: false }),
        useCancelMutation: () => ({ mutate, isPending: false, isError: false }),
    };
});

vi.mock('./api', async (importOriginal) => {
    const mod: any = await importOriginal();
    return {
        ...mod,
        getMyLeaveRequest: vi.fn(),
    };
});

const { getMyLeaveRequest } = await import('./api');

describe('LeaveRequestDetailPage', () => {
    beforeEach(() => {
        mutate.mockReset();
        (getMyLeaveRequest as any).mockReset();
    });

    it('enables submit only when draft', async () => {
        (getMyLeaveRequest as any).mockResolvedValue({
            id: 'lr-1',
            employee: { id: 'u1', name: 'E', department: { id: 'd', name: 'D' } },
            leaveType: { id: 'lt', name: '年假', annualQuota: 10, carryOver: false, requireAttachment: false, isActive: true },
            startDate: '2026-02-03',
            endDate: '2026-02-03',
            days: 1,
            reason: null,
            status: 'draft',
            createdAt: '2026-01-01T00:00:00.000Z',
            submittedAt: null,
            cancelledAt: null,
            decidedAt: null,
            rejectionReason: null,
            approver: null,
            attachment: null,
        });

        renderWithProviders(
            <Routes>
                <Route path="/me/leave-requests/:id" element={<LeaveRequestDetailPage />} />
            </Routes>,
            { route: '/me/leave-requests/lr-1' },
        );

        await screen.findByText('請假詳情');
        expect(screen.getByRole('button', { name: '送出' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '撤回' })).toBeDisabled();
    });

    it('enables cancel only when submitted', async () => {
        (getMyLeaveRequest as any).mockResolvedValue({
            id: 'lr-2',
            employee: { id: 'u1', name: 'E', department: { id: 'd', name: 'D' } },
            leaveType: { id: 'lt', name: '年假', annualQuota: 10, carryOver: false, requireAttachment: false, isActive: true },
            startDate: '2026-02-03',
            endDate: '2026-02-03',
            days: 1,
            reason: null,
            status: 'submitted',
            createdAt: '2026-01-01T00:00:00.000Z',
            submittedAt: '2026-01-02T00:00:00.000Z',
            cancelledAt: null,
            decidedAt: null,
            rejectionReason: null,
            approver: null,
            attachment: null,
        });

        renderWithProviders(
            <Routes>
                <Route path="/me/leave-requests/:id" element={<LeaveRequestDetailPage />} />
            </Routes>,
            { route: '/me/leave-requests/lr-2' },
        );

        await screen.findByText('請假詳情');
        expect(screen.getByRole('button', { name: '送出' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '撤回' })).toBeEnabled();
    });
});
