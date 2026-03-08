import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listPaymentMethods, listScenarioTemplates } from '../api/catalog';
import { createOrder } from '../api/orders';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  amount: z.coerce.number().int().positive(),
  currency: z.string().min(1).default('TWD'),
  callback_url: z.string().url(),
  webhook_url: z.string().url().optional().or(z.literal('')),
  payment_method_code: z.string().min(1),
  simulation_scenario: z.enum(['success', 'failed', 'cancelled', 'timeout', 'delayed_success']),
  delay_sec: z.coerce.number().int().min(0).optional(),
  webhook_delay_sec: z.coerce.number().int().min(0).optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function OrderCreatePage() {
  const navigate = useNavigate();

  const paymentMethods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => listPaymentMethods(),
  });
  const scenarios = useQuery({
    queryKey: ['scenario-templates'],
    queryFn: () => listScenarioTemplates(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 100,
      currency: 'TWD',
      callback_url: 'http://localhost:9999/callback',
      webhook_url: '',
      simulation_scenario: 'success',
      delay_sec: 0,
    },
  });

  const m = useMutation({
    mutationFn: (v: FormValues) =>
      createOrder({
        amount: v.amount,
        currency: v.currency,
        callback_url: v.callback_url,
        webhook_url: v.webhook_url ? v.webhook_url : null,
        payment_method_code: v.payment_method_code,
        simulation_scenario: v.simulation_scenario,
        delay_sec: v.delay_sec,
        webhook_delay_sec: v.webhook_delay_sec,
        error_code: v.error_code ? v.error_code : null,
        error_message: v.error_message ? v.error_message : null,
      }),
    onSuccess: (data) => {
      navigate(`/pay/${data.order.order_no}`);
    },
  });

  if (paymentMethods.isLoading || scenarios.isLoading) return <Spinner />;
  if (paymentMethods.isError)
    return (
      <Alert kind="error" title="Failed to load payment methods">
        {(paymentMethods.error as any)?.message}
      </Alert>
    );
  if (scenarios.isError)
    return (
      <Alert kind="error" title="Failed to load scenario templates">
        {(scenarios.error as any)?.message}
      </Alert>
    );

  const pmItems = paymentMethods.data!.items.filter((x) => x.enabled);
  const scItems = scenarios.data!.items.filter((x) => x.enabled);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Create order</h1>

      {m.isError ? (
        <div className="mb-3">
          <Alert kind="error" title="Create order failed">
            {(m.error as any)?.message ?? 'Unknown error'}
          </Alert>
        </div>
      ) : null}

      <form className="space-y-3 rounded-lg border bg-white p-4" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount" type="number" {...form.register('amount')} error={form.formState.errors.amount?.message} />
          <Input label="Currency" {...form.register('currency')} error={form.formState.errors.currency?.message} />
        </div>

        <Input label="Callback URL" {...form.register('callback_url')} error={form.formState.errors.callback_url?.message} />
        <Input
          label="Webhook URL (optional)"
          placeholder="https://example.com/webhook"
          {...form.register('webhook_url')}
          error={form.formState.errors.webhook_url?.message}
        />

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Payment method</div>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" {...form.register('payment_method_code')}>
            {pmItems.map((pm) => (
              <option key={pm.id} value={pm.code}>
                {pm.display_name} ({pm.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Scenario</div>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" {...form.register('simulation_scenario')}>
            {scItems.map((s) => (
              <option key={s.id} value={s.scenario}>
                {s.scenario}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Delay sec (optional)" type="number" {...form.register('delay_sec')} />
          <Input label="Webhook delay sec (optional)" type="number" {...form.register('webhook_delay_sec')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Error code (optional)" {...form.register('error_code')} />
          <Input label="Error message (optional)" {...form.register('error_message')} />
        </div>

        <Button type="submit" disabled={m.isPending}>
          {m.isPending ? 'Creating…' : 'Create & go to pay page'}
        </Button>

        <div className="text-xs text-slate-600">Tip: callback_url/webhook_url must be valid http/https URLs.</div>
      </form>
    </div>
  );
}
