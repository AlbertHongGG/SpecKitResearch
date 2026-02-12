import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';

export function RequireAuth(props: { children: React.ReactNode }) {
    const me = useAuthStore((s) => s.me);
    const loadMe = useAuthStore((s) => s.loadMe);
    const loading = useAuthStore((s) => s.meLoading);
    const location = useLocation();

    useEffect(() => {
        void loadMe();
    }, [loadMe]);

    if (loading && !me) return <div style={{ padding: 16 }}>Loading…</div>;
    if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    return <>{props.children}</>;
}
