import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

export function useAuthRequiredRedirect() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onAuthRequired() {
      queryClient.setQueryData(['session'], { authenticated: false });

      const path = location.pathname;
      const isAlreadyOnGuestPage = path === '/login' || path === '/register';
      if (!isAlreadyOnGuestPage) {
        navigate('/login', { replace: true });
      }
    }

    window.addEventListener('auth:required', onAuthRequired);
    return () => window.removeEventListener('auth:required', onAuthRequired);
  }, [location.pathname, navigate, queryClient]);
}
