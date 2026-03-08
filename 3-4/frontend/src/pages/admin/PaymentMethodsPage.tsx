import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCreatePaymentMethod, adminListPaymentMethods, adminUpdatePaymentMethod } from '../../api/admin';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';

export function PaymentMethodsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'payment-methods'], queryFn: () => adminListPaymentMethods() });

  const toggle = useMutation({
    mutationFn: (input: { code: string; enabled: boolean }) => adminUpdatePaymentMethod(input.code, { enabled: input.enabled }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
    },
  });

  const form = useForm({ defaultValues: { code: '', display_name: '', enabled: true, sort_order: 0 } });

  const create = useMutation({
    mutationFn: (v: any) => adminCreatePaymentMethod(v),
    onSuccess: async () => {
      form.reset({ code: '', display_name: '', enabled: true, sort_order: 0 });
      await qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payment methods</h1>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 text-sm font-medium">Create</div>
        {create.isError ? (
          <div className="mb-2">
            <Alert kind="error">{(create.error as any)?.message}</Alert>
          </div>
        ) : null}
        <form className="grid grid-cols-4 gap-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <Input label="Code" {...form.register('code', { required: true })} />
          <Input label="Name" {...form.register('display_name', { required: true })} />
          <Input label="Sort" type="number" {...form.register('sort_order', { valueAsNumber: true })} />
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>

      {q.isLoading ? <Spinner /> : null}
      {q.isError ? (
        <Alert kind="error" title="Failed to load">
          {(q.error as any)?.message}
        </Alert>
      ) : null}

      {q.data ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((pm) => (
                <tr key={pm.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{pm.code}</td>
                  <td className="px-3 py-2">{pm.display_name}</td>
                  <td className="px-3 py-2">{String(pm.enabled)}</td>
                  <td className="px-3 py-2">
                    <Button
                      variant="secondary"
                      onClick={() => toggle.mutate({ code: pm.code, enabled: !pm.enabled })}
                      disabled={toggle.isPending}
                    >
                      Toggle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
