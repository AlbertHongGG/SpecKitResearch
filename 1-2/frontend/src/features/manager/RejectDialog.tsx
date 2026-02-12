import { useEffect, useId, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function RejectDialog(props: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    pending?: boolean;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const errorId = useId();

    useEffect(() => {
        if (!props.open) {
            setReason('');
            setError(null);
        }
    }, [props.open]);

    return (
        <Modal open={props.open} title="退回原因" onClose={props.onClose}>
            <div style={{ display: 'grid', gap: 12 }}>
                <label>
                    原因（必填）
                    <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={error ? errorId : undefined}
                    />
                </label>
                {error ? (
                    <div id={errorId} role="alert" style={{ color: 'crimson' }}>
                        {error}
                    </div>
                ) : null}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <Button type="button" onClick={props.onClose} disabled={props.pending}>
                        取消
                    </Button>
                    <Button
                        type="button"
                        disabled={props.pending}
                        onClick={() => {
                            setError(null);
                            if (!reason.trim()) {
                                setError('請輸入原因');
                                return;
                            }
                            void props.onConfirm(reason.trim());
                        }}
                    >
                        {props.pending ? '送出中…' : '確認退回'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
