"use client";

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

import { presentError } from "@/src/ui/errors/errorPresenter";

type ToastItem = { id: string; message: string; devMessage?: string; variant?: "info" | "error" };

type ToastContextValue = {
  push: (message: string, variant?: ToastItem["variant"]) => void;
  pushError: (error: unknown) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastItem["variant"] = "info") => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, message, variant };
    setItems((prev) => [...prev, item]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const pushError = useCallback(
    (error: unknown) => {
      const presented = presentError(error);
      const id = crypto.randomUUID();
      const item: ToastItem = { id, message: presented.userMessage, devMessage: presented.devMessage, variant: "error" };
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 6000);
    },
    [setItems],
  );

  const value = useMemo(() => ({ push, pushError }), [push, pushError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "rounded-md px-4 py-2 text-sm shadow " +
              (t.variant === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white")
            }
          >
            <div>{t.message}</div>
            {process.env.NODE_ENV !== "production" && t.devMessage ? (
              <div className="mt-1 text-xs opacity-80">{t.devMessage}</div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider is missing");
  return ctx;
}
