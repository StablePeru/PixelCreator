import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  operation: string;
  canvas?: string;
  success: boolean;
  source: 'api' | 'external';
  duration?: number;
  args?: Record<string, unknown>;
}

interface AgentPanelProps {
  subscribe: (event: string, cb: (data: unknown) => void) => () => void;
}

const TOPIC_COLORS: Record<string, string> = {
  draw: '#5ba3d9',
  transform: '#6ebe3a',
  select: '#f0c040',
  clipboard: '#a4de6a',
  canvas: '#e84040',
  history: '#9e9e9e',
};

function getTopicColor(operation: string): string {
  const topic = operation.split(':')[0];
  return TOPIC_COLORS[topic] || '#888';
}

export function AgentPanel({ subscribe }: AgentPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial log
  useEffect(() => {
    fetch('/api/agent/log')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {});
  }, []);

  // Subscribe to new commands
  useEffect(() => {
    return subscribe('agent:command-complete', (data) => {
      setEntries((prev) => [...prev.slice(-199), data as LogEntry]);
    });
  }, [subscribe]);

  // Subscribe to external canvas changes
  useEffect(() => {
    return subscribe('canvas:updated', (data) => {
      const d = data as { canvasName?: string };
      setEntries((prev) => [...prev.slice(-199), {
        id: `ext-${Date.now()}`,
        timestamp: Date.now(),
        operation: 'canvas:updated',
        canvas: d.canvasName,
        success: true,
        source: 'external' as const,
      }]);
    });
  }, [subscribe]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (collapsed) {
    return (
      <div className="agent-panel agent-panel--collapsed" onClick={() => setCollapsed(false)}>
        <span>Agent ({entries.length})</span>
      </div>
    );
  }

  return (
    <div className="agent-panel">
      <div className="agent-panel__header" onClick={() => setCollapsed(true)}>
        <span>Agent Activity ({entries.length})</span>
        <span className="agent-panel__collapse">{'\u25BC'}</span>
      </div>
      <div className="agent-panel__list" ref={scrollRef}>
        {entries.length === 0 && (
          <div className="agent-panel__empty">No activity yet</div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="agent-panel__entry"
            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
          >
            <span className="agent-panel__time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className="agent-panel__op" style={{ color: getTopicColor(entry.operation) }}>
              {entry.operation}
            </span>
            {entry.canvas && <span className="agent-panel__canvas">{entry.canvas}</span>}
            <span className="agent-panel__status">
              {entry.source === 'external' ? '\u26A1' : entry.success ? '\u2713' : '\u2717'}
            </span>
            {entry.duration != null && (
              <span className="agent-panel__duration">{entry.duration}ms</span>
            )}
            {expanded === entry.id && entry.args && (
              <pre className="agent-panel__args">{JSON.stringify(entry.args, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
