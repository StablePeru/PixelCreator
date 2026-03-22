import type { WsStatus } from '../hooks/useWebSocket';

export function ConnectionStatus({ status }: { status: WsStatus }) {
  return (
    <div className="status">
      <div className={`status__dot status__dot--${status}`} />
      <span className="topbar__info">{status}</span>
    </div>
  );
}
