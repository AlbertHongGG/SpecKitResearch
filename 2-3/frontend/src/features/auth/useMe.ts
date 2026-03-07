'use client';

import { useQuery } from '@tanstack/react-query';

import { api, type User } from '../../lib/api/client';
import { ApiError } from '../../lib/api/http';

export function useMe() {
    return useQuery({
        queryKey: ['me'],
        queryFn: async (): Promise<User | null> => {
            try {
                return await api.me();
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) {
                    try {
                        await api.refresh();
                        return await api.me();
                    } catch (refreshErr) {
                        if (refreshErr instanceof ApiError && refreshErr.status === 401) return null;
                        throw refreshErr;
                    }
                }
                throw err;
            }
        },
        staleTime: 30_000,
    });
}
