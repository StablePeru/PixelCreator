import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentSession, AgentOperation, OperationFeedback } from '@pixelcreator/core';

interface UseAgentSessionResult {
  session: AgentSession | null;
  isActive: boolean;
  isPaused: boolean;
  pendingOperation: AgentOperation | null;
  start: (canvas: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: () => Promise<void>;
  approve: (operationId: string) => Promise<void>;
  reject: (operationId: string) => Promise<void>;
  sendFeedback: (operationId: string, feedback: OperationFeedback) => Promise<void>;
}

export function useAgentSession(
  subscribe: (event: string, cb: (data: unknown) => void) => () => void,
): UseAgentSessionResult {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [pendingOperation, setPendingOperation] = useState<AgentOperation | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Refresh session state from server
  const refreshSession = useCallback(() => {
    fetch('/api/agent/session')
      .then(r => r.json())
      .then(data => {
        if (data.session) {
          setSession(data.session);
          const pending = data.session.operations?.find(
            (op: AgentOperation) => op.status === 'pending'
          );
          setPendingOperation(pending ?? null);
        } else if (data.status === 'idle') {
          setSession(null);
          setPendingOperation(null);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch current session on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Poll session state every 2s when active
  useEffect(() => {
    if (!session || session.status === 'completed' || session.status === 'idle') return;
    const interval = setInterval(refreshSession, 2000);
    return () => clearInterval(interval);
  }, [session?.status, refreshSession]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubs = [
      subscribe('agent:session-update', () => {
        refreshSession();
      }),
      subscribe('agent:operation-pending', () => {
        refreshSession();
      }),
      subscribe('agent:session-end', () => {
        setSession(prev => prev ? { ...prev, status: 'completed' } : null);
        setPendingOperation(null);
      }),
      subscribe('canvas:updated', () => {
        if (sessionRef.current && sessionRef.current.status !== 'completed') {
          refreshSession();
        }
      }),
      subscribe('agent:command-complete', () => {
        if (sessionRef.current && sessionRef.current.status !== 'completed') {
          refreshSession();
        }
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [subscribe, refreshSession]);

  const start = useCallback(async (canvas: string) => {
    const res = await fetch('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas }),
    });
    if (res.ok) {
      const s = await res.json();
      setSession(s);
      setPendingOperation(null);
    }
  }, []);

  const pause = useCallback(async () => {
    const res = await fetch('/api/agent/session/pause', { method: 'POST' });
    if (res.ok) setSession(await res.json());
  }, []);

  const resume = useCallback(async () => {
    const res = await fetch('/api/agent/session/resume', { method: 'POST' });
    if (res.ok) setSession(await res.json());
  }, []);

  const end = useCallback(async () => {
    await fetch('/api/agent/session/end', { method: 'POST' });
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
    setPendingOperation(null);
  }, []);

  const approve = useCallback(async (operationId: string) => {
    await fetch(`/api/agent/session/approve/${operationId}`, { method: 'POST' });
    setPendingOperation(null);
    refreshSession();
  }, [refreshSession]);

  const reject = useCallback(async (operationId: string) => {
    await fetch(`/api/agent/session/reject/${operationId}`, { method: 'POST' });
    setPendingOperation(null);
    refreshSession();
  }, [refreshSession]);

  const sendFeedback = useCallback(async (operationId: string, feedback: OperationFeedback) => {
    await fetch(`/api/agent/session/feedback/${operationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    refreshSession();
  }, [refreshSession]);

  const isActive = session !== null && session.status !== 'completed' && session.status !== 'idle';
  const isPaused = session?.status === 'paused';

  return {
    session,
    isActive,
    isPaused,
    pendingOperation,
    start,
    pause,
    resume,
    end,
    approve,
    reject,
    sendFeedback,
  };
}
