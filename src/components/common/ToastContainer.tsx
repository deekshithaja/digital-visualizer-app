import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'error' ? AlertCircle : toast.type === 'success' ? CheckCircle2 : Info;
        const iconColor =
          toast.type === 'error'
            ? 'text-red-600 dark:text-red-400'
            : toast.type === 'success'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-[#A9B7CE] dark:text-[#F4F7FF]';

        return (
          <div
            key={toast.id}
            role="status"
            className="flex items-start gap-3 rounded-lg border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] p-3.5 shadow-sm"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#F4F7FF] dark:text-[#F4F7FF]">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 text-[#A9B7CE] hover:bg-slate-100 hover:text-[#A9B7CE] dark:hover:bg-[#172641] dark:hover:text-slate-200 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
