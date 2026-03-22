import { useEffect, useRef, useState, useCallback } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface WsMessage {
  event: string;
  data: unknown;
  timestamp: number;
}

type EventCallback = (data: unknown) => void;

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const retryRef = useRef(0);

  const subscribe = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (!mounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        if (!mounted) return;
        setStatus('connected');
        retryRef.current = 0;
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          const handlers = listenersRef.current.get(msg.event);
          if (handlers) {
            for (const handler of handlers) handler(msg.data);
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setStatus('disconnected');
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  return { status, subscribe };
}
