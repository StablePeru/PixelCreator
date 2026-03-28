import { useToast, type ToastType } from '../hooks/useToast';

const ICONS: Record<ToastType, string> = {
  success: '\u2714',
  error: '\u2718',
  info: '\u2139',
  warning: '\u26A0',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => dismiss(t.id)}
        >
          <span className="toast__icon">{ICONS[t.type]}</span>
          <span className="toast__message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
