import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectDialog } from './RejectDialog';
import { renderWithProviders } from '../../../test/test-utils';

describe('RejectDialog', () => {
    it('requires reason', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onConfirm = vi.fn(async () => undefined);

        renderWithProviders(<RejectDialog open={true} onClose={onClose} onConfirm={onConfirm} />);

        await user.click(screen.getByRole('button', { name: '確認退回' }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByText('請輸入原因')).toBeInTheDocument();
    });

    it('disables actions while pending', () => {
        const onClose = vi.fn();
        const onConfirm = vi.fn(async () => undefined);

        renderWithProviders(<RejectDialog open={true} onClose={onClose} onConfirm={onConfirm} pending={true} />);

        expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '送出中…' })).toBeDisabled();
    });
});
