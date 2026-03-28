import { useToast, type ToastType } from '../hooks/useToast';
import { CheckIcon, CrossIcon, InfoIcon, WarningIcon } from './Icons';

const ICONS: Record<ToastType, (props: { size?: number }) => JSX.Element> = {
  success: CheckIcon,
  error: CrossIcon,
  info: InfoIcon,
  warning: WarningIcon,
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id} className={`toast toast--${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast__icon">
              <Icon size={14} />
            </span>
            <span className="toast__message">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
