import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, UseFormProps } from 'react-hook-form';

type NoInfer<T> = [T][T extends unknown ? 0 : never];
type ZodResolverSchema = Parameters<typeof zodResolver>[0];

export function zodForm<TFieldValues extends FieldValues>(
    schema: ZodResolverSchema,
    options?: Omit<UseFormProps<NoInfer<TFieldValues>>, 'resolver'>,
): UseFormProps<TFieldValues> {
    const resolver = zodResolver(schema) as unknown as UseFormProps<TFieldValues>['resolver'];
    return {
        ...options,
        resolver,
    };
}
