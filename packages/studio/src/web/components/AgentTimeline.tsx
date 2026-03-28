import { useEffect, useRef } from 'react';
import type { AgentOperation } from '@pixelcreator/core';

interface AgentTimelineProps {
  operations: AgentOperation[];
  onSelectOperation?: (op: AgentOperation) => void;
}

const STATUS_ICONS: Record<string, { icon: string; className: string }> = {
  approved: { icon: '\u2713', className: 'agent-timeline__icon--approved' },
  rejected: { icon: '\u2717', className: 'agent-timeline__icon--rejected' },
  pending: { icon: '\u25CF', className: 'agent-timeline__icon--pending' },
  auto: { icon: '\u26A1', className: 'agent-timeline__icon--auto' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function AgentTimeline({ operations, onSelectOperation }: AgentTimelineProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [operations.length]);

  if (operations.length === 0) {
    return (
      <div className="agent-timeline">
        <div className="agent-timeline__empty">
          Waiting for agent operations...
        </div>
      </div>
    );
  }

  return (
    <div className="agent-timeline" ref={listRef}>
      {operations.map((op) => {
        const statusInfo = STATUS_ICONS[op.status] ?? STATUS_ICONS.auto;
        return (
          <div
            key={op.id}
            className={`agent-timeline__entry ${op.status === 'pending' ? 'agent-timeline__entry--pending' : ''}`}
            onClick={() => onSelectOperation?.(op)}
          >
            <span className={`agent-timeline__icon ${statusInfo.className}`}>
              {statusInfo.icon}
            </span>
            <span className="agent-timeline__command">{op.command}</span>
            {op.feedback && <span className="agent-timeline__feedback-icon" title="Has feedback">{'\u{1F4AC}'}</span>}
            <span className="agent-timeline__time">{formatTime(op.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
