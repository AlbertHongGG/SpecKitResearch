"use client";

import { PropsWithChildren, useEffect, useId, useRef } from "react";

export function Modal({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg bg-white shadow outline-none"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="關閉"
            className="rounded px-2 py-1 text-sm hover:bg-gray-100"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
