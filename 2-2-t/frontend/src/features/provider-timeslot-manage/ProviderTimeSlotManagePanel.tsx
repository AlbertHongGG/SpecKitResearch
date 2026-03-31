import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { ApiError, apiGetJson, apiPatchJson, apiPostJson } from '../../api/http';
import { TimeSlotSchema, TimeSlotsListResponseSchema } from '../../api/schemas';
import type { Service } from '../../api/schemas';

function toIsoFromDatetimeLocal(value: string) {
  // HTML datetime-local is interpreted as local time; backend stores UTC ISO.
  return new Date(value).toISOString();
}

const CreateSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  cancelDeadlineAt: z.string().min(1),
  capacity: z.coerce.number().int().min(0),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

type CreateFormInput = z.input<typeof CreateSchema>;
type CreateFormData = z.output<typeof CreateSchema>;

const UpdateSchema = z
  .object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    cancelDeadlineAt: z.string().min(1),
    capacity: z.coerce.number().int().min(0),
    status: z.enum(['OPEN', 'CLOSED']),
  })
  .strict();

type UpdateFormData = z.infer<typeof UpdateSchema>;
type UpdateFormInput = z.input<typeof UpdateSchema>;

export function ProviderTimeSlotManagePanel(input: { services: Service[] }) {
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState<string>(() => input.services[0]?.id ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);

  const timeSlotsQuery = useQuery({
    queryKey: ['provider-timeslots', serviceId],
    enabled: Boolean(serviceId),
    queryFn: () => apiGetJson(`/provider/services/${serviceId}/timeslots`, TimeSlotsListResponseSchema),
  });

  const createForm = useForm<CreateFormInput, unknown, CreateFormData>({
    resolver: zodResolver(CreateSchema),
    defaultValues: { startTime: '', endTime: '', cancelDeadlineAt: '', capacity: 0, status: 'OPEN' },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      return apiPostJson(
        `/provider/services/${serviceId}/timeslots`,
        {
          startTime: toIsoFromDatetimeLocal(data.startTime),
          endTime: toIsoFromDatetimeLocal(data.endTime),
          cancelDeadlineAt: toIsoFromDatetimeLocal(data.cancelDeadlineAt),
          capacity: data.capacity,
          ...(data.status ? { status: data.status } : {}),
        },
        TimeSlotSchema,
      );
    },
    onSuccess: async () => {
      createForm.reset({ startTime: '', endTime: '', cancelDeadlineAt: '', capacity: 0, status: 'OPEN' });
      await queryClient.invalidateQueries({ queryKey: ['provider-timeslots', serviceId] });
    },
  });

  const createErrorMessage = useMemo(() => {
    if (!createMutation.error) return null;
    if (createMutation.error instanceof ApiError) {
      if (createMutation.error.code === 'TIMESLOT_OVERLAP') return 'This time slot overlaps an existing one.';
      return createMutation.error.message;
    }
    return 'Create timeslot failed.';
  }, [createMutation.error]);

  if (input.services.length === 0) {
    return <div className="text-sm text-gray-600">Create a service first.</div>;
  }

  const items = timeSlotsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs" htmlFor="provider-timeslot-service">
          Service
        </label>
        <select
          id="provider-timeslot-service"
          className="rounded border px-3 py-2 text-sm"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setEditingId(null);
          }}
        >
          {input.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Create time slot</h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3"
          onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs" htmlFor="timeslot-start">
                Start
              </label>
              <input
                id="timeslot-start"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...createForm.register('startTime')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor="timeslot-end">
                End
              </label>
              <input
                id="timeslot-end"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...createForm.register('endTime')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor="timeslot-deadline">
                Cancel deadline
              </label>
              <input
                id="timeslot-deadline"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...createForm.register('cancelDeadlineAt')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs" htmlFor="timeslot-capacity">
                Capacity
              </label>
              <input
                id="timeslot-capacity"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="number"
                min={0}
                {...createForm.register('capacity')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor="timeslot-status">
                Status
              </label>
              <select
                id="timeslot-status"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...createForm.register('status')}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
              disabled={createForm.formState.isSubmitting || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            {createErrorMessage ? <p className="text-xs text-red-700">{createErrorMessage}</p> : null}
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Time slots</h3>
        {timeSlotsQuery.isLoading ? (
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        ) : timeSlotsQuery.isError ? (
          <p className="mt-2 text-sm text-red-700">Error loading time slots.</p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No time slots yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((t) => (
              <TimeSlotRow
                key={t.id}
                timeSlot={t}
                editing={editingId === t.id}
                onStartEdit={() => setEditingId(t.id)}
                onStopEdit={() => setEditingId(null)}
                onUpdated={async () => {
                  await queryClient.invalidateQueries({ queryKey: ['provider-timeslots', serviceId] });
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TimeSlotRow(input: {
  timeSlot: z.infer<typeof TimeSlotSchema>;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdated: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateFormInput, unknown, UpdateFormData>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: {
      startTime: new Date(input.timeSlot.startTime).toISOString().slice(0, 16),
      endTime: new Date(input.timeSlot.endTime).toISOString().slice(0, 16),
      cancelDeadlineAt: new Date(input.timeSlot.cancelDeadlineAt).toISOString().slice(0, 16),
      capacity: input.timeSlot.capacity,
      status: input.timeSlot.status,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateFormData) => {
      return apiPatchJson(
        `/provider/timeslots/${input.timeSlot.id}`,
        {
          startTime: toIsoFromDatetimeLocal(data.startTime),
          endTime: toIsoFromDatetimeLocal(data.endTime),
          cancelDeadlineAt: toIsoFromDatetimeLocal(data.cancelDeadlineAt),
          capacity: data.capacity,
          status: data.status,
        },
        TimeSlotSchema,
      );
    },
    onSuccess: async () => {
      await input.onUpdated();
      await queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      input.onStopEdit();
    },
  });

  const errorMessage = useMemo(() => {
    if (!updateMutation.error) return null;
    if (updateMutation.error instanceof ApiError) {
      if (updateMutation.error.code === 'TIMESLOT_OVERLAP') return 'This time slot overlaps an existing one.';
      if (updateMutation.error.code === 'TIMESLOT_CAPACITY_BELOW_BOOKED')
        return 'Capacity cannot be lower than booked count.';
      return updateMutation.error.message;
    }
    return 'Update failed.';
  }, [updateMutation.error]);

  return (
    <li className="rounded border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">
            {new Date(input.timeSlot.startTime).toLocaleString()} -{' '}
            {new Date(input.timeSlot.endTime).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Status: {input.timeSlot.status} | Capacity: {input.timeSlot.capacity} | Booked:{' '}
            {input.timeSlot.bookedCount}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {input.editing ? (
            <>
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={input.onStopEdit}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-60"
                disabled={updateMutation.isPending}
                onClick={form.handleSubmit((d) => updateMutation.mutate(d))}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={input.onStartEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {input.editing ? (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs" htmlFor={`ts-start-${input.timeSlot.id}`}>
                Start
              </label>
              <input
                id={`ts-start-${input.timeSlot.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...form.register('startTime')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor={`ts-end-${input.timeSlot.id}`}>
                End
              </label>
              <input
                id={`ts-end-${input.timeSlot.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...form.register('endTime')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor={`ts-deadline-${input.timeSlot.id}`}>
                Cancel deadline
              </label>
              <input
                id={`ts-deadline-${input.timeSlot.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="datetime-local"
                {...form.register('cancelDeadlineAt')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs" htmlFor={`ts-capacity-${input.timeSlot.id}`}>
                Capacity
              </label>
              <input
                id={`ts-capacity-${input.timeSlot.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="number"
                min={0}
                {...form.register('capacity')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor={`ts-status-${input.timeSlot.id}`}>
                Status
              </label>
              <select
                id={`ts-status-${input.timeSlot.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...form.register('status')}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
