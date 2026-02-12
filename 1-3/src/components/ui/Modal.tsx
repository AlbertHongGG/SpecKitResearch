'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

function getFocusable(container: HTMLElement) {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
  return nodes.filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element, else focus the dialog panel.
    window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      (focusables[0] ?? panel).focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();

      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = getFocusable(panel);
        if (focusables.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute left-1/2 top-1/2 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id={titleId} className="text-sm font-semibold">
            {title}
          </h3>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
            onClick={onClose}
            aria-label="關閉對話框"
          >
            關閉
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
