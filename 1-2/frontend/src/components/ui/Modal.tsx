import { useEffect, useId, useRef } from 'react';

function getFocusable(container: HTMLElement) {
    const nodes = container.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    return Array.from(nodes).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
}

export function Modal(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
    if (!props.open) return null;

    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const lastActiveRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        lastActiveRef.current = document.activeElement as HTMLElement | null;
        // focus close button first for predictable keyboard UX
        closeBtnRef.current?.focus();

        return () => {
            lastActiveRef.current?.focus?.();
        };
    }, []);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                display: 'grid',
                placeItems: 'center',
                padding: 16,
                zIndex: 50,
            }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) props.onClose();
            }}
        >
            <div
                ref={dialogRef}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        props.onClose();
                        return;
                    }

                    if (e.key !== 'Tab') return;
                    const container = dialogRef.current;
                    if (!container) return;

                    const focusable = getFocusable(container);
                    if (focusable.length === 0) return;

                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    const active = document.activeElement as HTMLElement | null;

                    if (e.shiftKey) {
                        if (!active || active === first || !container.contains(active)) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (!active || active === last || !container.contains(active)) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }}
                style={{ background: '#fff', borderRadius: 10, padding: 16, minWidth: 360, maxWidth: 520, width: '100%' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <strong id={titleId} style={{ marginRight: 'auto' }}>
                        {props.title}
                    </strong>
                    <button ref={closeBtnRef} onClick={props.onClose} aria-label="Close">
                        ✕
                    </button>
                </div>
                {props.children}
            </div>
        </div>
    );
}
