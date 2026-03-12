'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
    id: string;
    message: string;
    variant: 'success' | 'error' | 'info';
};

type ToastContextValue = {
    push: (message: string, variant?: Toast['variant']) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function randomId() {
    return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const push = useCallback((message: string, variant: Toast['variant'] = 'info') => {
        const id = randomId();
        setToasts((prev) => [...prev, { id, message, variant }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    const value = useMemo(() => ({ push }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`rounded border px-3 py-2 text-sm shadow-sm ${t.variant === 'error'
                                ? 'border-red-300 bg-red-50 text-red-900'
                                : t.variant === 'success'
                                    ? 'border-green-300 bg-green-50 text-green-900'
                                    : 'border-slate-200 bg-white text-slate-900'
                            }`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
