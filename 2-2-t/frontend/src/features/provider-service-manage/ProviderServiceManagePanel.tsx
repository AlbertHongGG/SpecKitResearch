import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';

import { ApiError, apiGetJson, apiPostJson, apiPatchJson } from '../../api/http';
import { ServiceSchema, ServicesListResponseSchema } from '../../api/schemas';

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  durationMinutes: z.coerce.number().int().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

type CreateFormInput = z.input<typeof CreateSchema>;
type CreateFormData = z.output<typeof CreateSchema>;

const UpdateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    durationMinutes: z.coerce.number().int().min(1),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

type UpdateFormData = z.infer<typeof UpdateSchema>;
type UpdateFormInput = z.input<typeof UpdateSchema>;

export function ProviderServiceManagePanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['provider-services'],
    queryFn: () => apiGetJson('/provider/services', ServicesListResponseSchema),
  });

  const createForm = useForm<CreateFormInput, unknown, CreateFormData>({
    resolver: zodResolver(CreateSchema),
    defaultValues: { name: '', description: '', durationMinutes: 30, status: 'ACTIVE' },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      return apiPostJson(
        '/provider/services',
        {
          name: data.name,
          description: data.description,
          durationMinutes: data.durationMinutes,
          ...(data.status ? { status: data.status } : {}),
        },
        ServiceSchema,
      );
    },
    onSuccess: async () => {
      createForm.reset({ name: '', description: '', durationMinutes: 30, status: 'ACTIVE' });
      await queryClient.invalidateQueries({ queryKey: ['provider-services'] });
    },
  });

  const createErrorMessage = useMemo(() => {
    if (!createMutation.error) return null;
    if (createMutation.error instanceof ApiError) return createMutation.error.message;
    return 'Create service failed.';
  }, [createMutation.error]);

  if (servicesQuery.isLoading) return <div>Loading...</div>;
  if (servicesQuery.isError) return <div className="text-sm text-red-700">Error loading services.</div>;

  const items = servicesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Create service</h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3"
          onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
        >
          <div>
            <label className="block text-xs" htmlFor="provider-service-name">
              Name
            </label>
            <input
              id="provider-service-name"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...createForm.register('name')}
            />
            {createForm.formState.errors.name ? (
              <p className="mt-1 text-xs text-red-700">{createForm.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs" htmlFor="provider-service-desc">
              Description
            </label>
            <textarea
              id="provider-service-desc"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              rows={3}
              {...createForm.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs" htmlFor="provider-service-duration">
                Duration (minutes)
              </label>
              <input
                id="provider-service-duration"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="number"
                min={1}
                {...createForm.register('durationMinutes')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor="provider-service-status">
                Status
              </label>
              <select
                id="provider-service-status"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...createForm.register('status')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
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
        <h3 className="text-sm font-semibold">My services</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No services yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                editing={editingId === s.id}
                onStartEdit={() => setEditingId(s.id)}
                onStopEdit={() => setEditingId(null)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ServiceRow(input: {
  service: z.infer<typeof ServiceSchema>;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<UpdateFormInput, unknown, UpdateFormData>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: {
      name: input.service.name,
      description: input.service.description,
      durationMinutes: input.service.durationMinutes,
      status: input.service.status,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateFormData) => {
      return apiPatchJson(
        `/provider/services/${input.service.id}`,
        {
          name: data.name,
          description: data.description,
          durationMinutes: data.durationMinutes,
          status: data.status,
        },
        ServiceSchema,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      input.onStopEdit();
    },
  });

  const errorMessage = useMemo(() => {
    if (!updateMutation.error) return null;
    if (updateMutation.error instanceof ApiError) return updateMutation.error.message;
    return 'Update failed.';
  }, [updateMutation.error]);

  return (
    <li className="rounded border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{input.service.name}</div>
          <div className="mt-1 text-xs text-gray-600">Status: {input.service.status}</div>
        </div>
        <div className="flex items-center gap-2">
          {input.editing ? (
            <>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => input.onStopEdit()}
              >
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
          <div>
            <label className="block text-xs" htmlFor={`service-name-${input.service.id}`}>
              Name
            </label>
            <input
              id={`service-name-${input.service.id}`}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...form.register('name')}
            />
          </div>
          <div>
            <label className="block text-xs" htmlFor={`service-desc-${input.service.id}`}>
              Description
            </label>
            <textarea
              id={`service-desc-${input.service.id}`}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              rows={2}
              {...form.register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs" htmlFor={`service-duration-${input.service.id}`}>
                Duration
              </label>
              <input
                id={`service-duration-${input.service.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                type="number"
                min={1}
                {...form.register('durationMinutes')}
              />
            </div>
            <div>
              <label className="block text-xs" htmlFor={`service-status-${input.service.id}`}>
                Status
              </label>
              <select
                id={`service-status-${input.service.id}`}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                {...form.register('status')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-700">{input.service.description}</p>
      )}
    </li>
  );
}
