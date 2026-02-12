import { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AttachmentUploader } from '../attachments/AttachmentUploader';

const schema = z.object({
    leaveTypeId: z.string().uuid(),
    startDate: z.string().min(10),
    endDate: z.string().min(10),
    reason: z.string().optional(),
    attachmentId: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof schema>;

type LeaveType = { id: string; name: string; requireAttachment: boolean; isActive: boolean };

export function LeaveRequestForm(props: {
    initial?: Partial<FormValues>;
    onSave: (values: FormValues) => Promise<void>;
    saving?: boolean;
}) {
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const leaveTypeErrId = useId();
    const startErrId = useId();
    const endErrId = useId();
    const attachmentErrId = useId();

    const leaveTypes = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => {
            const res = await apiFetch<{ items: LeaveType[] }>('/leave-types');
            return res.items;
        },
    });

    const defaultValues = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return {
            leaveTypeId: props.initial?.leaveTypeId ?? '',
            startDate: props.initial?.startDate ?? today,
            endDate: props.initial?.endDate ?? today,
            reason: props.initial?.reason ?? '',
            attachmentId: props.initial?.attachmentId,
        } satisfies Partial<FormValues>;
    }, [props.initial]);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValues as any,
    });

    useEffect(() => {
        form.reset(defaultValues as any);
    }, [defaultValues]);

    const requireAttachment = leaveTypes.data?.find((t) => t.id === form.watch('leaveTypeId'))?.requireAttachment ?? false;

    return (
        <form
            onSubmit={form.handleSubmit(async (values) => {
                await props.onSave(values);
            })}
            style={{ display: 'grid', gap: 12 }}
        >
            <label>
                假別
                <select
                    {...form.register('leaveTypeId')}
                    aria-invalid={Boolean(form.formState.errors.leaveTypeId) || undefined}
                    aria-describedby={form.formState.errors.leaveTypeId ? leaveTypeErrId : undefined}
                    style={{ width: '100%', padding: 8 }}
                >
                    <option value="">請選擇</option>
                    {leaveTypes.data?.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                {form.formState.errors.leaveTypeId ? (
                    <div id={leaveTypeErrId} role="alert" style={{ color: 'crimson' }}>
                        {form.formState.errors.leaveTypeId.message}
                    </div>
                ) : null}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>
                    開始
                    <Input
                        type="date"
                        {...form.register('startDate')}
                        aria-invalid={Boolean(form.formState.errors.startDate) || undefined}
                        aria-describedby={form.formState.errors.startDate ? startErrId : undefined}
                    />
                    {form.formState.errors.startDate ? (
                        <div id={startErrId} role="alert" style={{ color: 'crimson' }}>
                            {form.formState.errors.startDate.message}
                        </div>
                    ) : null}
                </label>
                <label>
                    結束
                    <Input
                        type="date"
                        {...form.register('endDate')}
                        aria-invalid={Boolean(form.formState.errors.endDate) || undefined}
                        aria-describedby={form.formState.errors.endDate ? endErrId : undefined}
                    />
                    {form.formState.errors.endDate ? (
                        <div id={endErrId} role="alert" style={{ color: 'crimson' }}>
                            {form.formState.errors.endDate.message}
                        </div>
                    ) : null}
                </label>
            </div>

            <label>
                原因（可選）
                <Input {...form.register('reason')} />
            </label>

            <div>
                <div style={{ marginBottom: 8 }}>
                    附件（{requireAttachment ? '必填' : '選填'}）{uploadedFileName ? `：${uploadedFileName}` : ''}
                </div>
                <AttachmentUploader
                    onUploaded={(attachmentId, filename) => {
                        setUploadedFileName(filename);
                        form.setValue('attachmentId', attachmentId);
                    }}
                />
                {requireAttachment && !form.watch('attachmentId') ? (
                    <div id={attachmentErrId} role="alert" style={{ color: 'crimson', marginTop: 4 }}>
                        此假別需要附件
                    </div>
                ) : null}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <Button type="submit" disabled={props.saving}>
                    {props.saving ? '儲存中…' : '儲存草稿'}
                </Button>
            </div>
        </form>
    );
}
