import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; message: string };

type ToastApi = {
    push: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider(props: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const push = useCallback((message: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const api = useMemo(() => ({ push }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {props.children}
            <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8, zIndex: 60 }}>
                {toasts.map((t) => (
                    <div key={t.id} style={{ background: '#111', color: '#fff', padding: '10px 12px', borderRadius: 8 }}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return ctx;
}
