import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { AuthUser } from '../authStore';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: req }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}
