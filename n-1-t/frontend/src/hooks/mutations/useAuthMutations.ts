import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login, logout, register } from '../../api/auth';

export function useAuthMutations() {
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(['session'], null);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  return { registerMutation, loginMutation, logoutMutation };
}
