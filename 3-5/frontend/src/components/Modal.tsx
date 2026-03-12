'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

function getFocusable(container: HTMLElement): HTMLElement[] {
    const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
    );
    return nodes.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

export function Modal(props: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    variant?: 'modal' | 'drawer';
    maxWidthClassName?: string;
}) {
    const { open, onClose, maxWidthClassName } = props;
    const variant = props.variant ?? 'modal';
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const canUseDOM = typeof document !== "undefined";

    const panelClassName = useMemo(() => {
        if (variant === 'drawer') {
            return `absolute right-0 top-0 h-full w-full overflow-y-auto bg-white shadow-xl ${maxWidthClassName ?? 'max-w-lg'
                }`;
        }
        return `absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl ${maxWidthClassName ?? 'max-w-lg'
            }`;
    }, [variant, maxWidthClassName]);

    useEffect(() => {
        if (!canUseDOM || !open) return;

        const previous = document.activeElement as HTMLElement | null;
        const panel = panelRef.current;

        document.body.style.overflow = 'hidden';

        const focusFirst = () => {
            if (!panel) return;
            const focusables = getFocusable(panel);
            (focusables[0] ?? panel).focus();
        };

        focusFirst();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;
            if (!panel) return;

            const focusables = getFocusable(panel);
            if (!focusables.length) {
                e.preventDefault();
                panel.focus();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (active === first || !panel.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
            previous?.focus?.();
        };
    }, [canUseDOM, open, onClose]);

    if (!canUseDOM || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
                aria-label="Close"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={panelClassName}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div id={titleId} className="text-sm font-medium">
                        {props.title}
                    </div>
                    <button type="button" className="rounded border px-2 py-1 text-xs" onClick={onClose}>
                        關閉
                    </button>
                </div>
                <div className={variant === 'drawer' ? 'p-4' : ''}>{props.children}</div>
            </div>
        </div>,
        document.body,
    );
}
