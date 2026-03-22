import { useState, useEffect, useCallback } from 'react';

interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export function useHistory(
  subscribe: (event: string, cb: (data: unknown) => void) => () => void,
) {
  const [status, setStatus] = useState<HistoryStatus>({
    canUndo: false, canRedo: false, undoCount: 0, redoCount: 0,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/history/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* offline */ }
  }, []);

  // Fetch on mount
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Re-fetch on any history or canvas event
  useEffect(() => {
    const unsub1 = subscribe('canvas:updated', fetchStatus);
    return unsub1;
  }, [subscribe, fetchStatus]);

  const undo = useCallback(async () => {
    const res = await fetch('/api/history/undo', { method: 'POST' });
    if (res.ok) fetchStatus();
  }, [fetchStatus]);

  const redo = useCallback(async () => {
    const res = await fetch('/api/history/redo', { method: 'POST' });
    if (res.ok) fetchStatus();
  }, [fetchStatus]);

  return { ...status, undo, redo };
}
