import type { ToastItem } from './toastTypes';
import { variantDefaults } from './ToastContext';

export function ToastViewport(props: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (props.toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {props.toasts.map((t) => {
        const styles = variantDefaults(t.variant);
        return (
          <div
            key={t.id}
            className={`rounded-lg border ${styles.border} ${styles.bg} p-3 shadow-sm`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold ${styles.title}`}>{t.title}</div>
                {t.description ? <div className={`mt-1 text-sm ${styles.body}`}>{t.description}</div> : null}
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white/60"
                onClick={() => props.onDismiss(t.id)}
              >
                關閉
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
