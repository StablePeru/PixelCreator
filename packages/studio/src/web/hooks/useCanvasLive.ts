import { useEffect, useState, useRef, useCallback } from 'react';

interface CanvasMetadata {
  name: string;
  width: number;
  height: number;
  layers: { id: string; name: string; visible: boolean; opacity: number; blendMode: string; locked: boolean; order: number }[];
  frames: { id: string; index: number; duration: number; label?: string }[];
  animationTags: { name: string; from: number; to: number; direction: string; repeat: number }[];
}

export function useCanvasLive(
  canvasName: string | null,
  subscribe: (event: string, cb: (data: unknown) => void) => () => void,
) {
  const [metadata, setMetadata] = useState<CanvasMetadata | null>(null);
  const [frameBitmap, setFrameBitmap] = useState<ImageBitmap | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchFrame = useCallback(async () => {
    if (!canvasName) return;
    const id = ++fetchIdRef.current;
    setLoading(true);

    try {
      const res = await fetch(`/api/canvas/${canvasName}/frame/${frameIndex}`);
      if (!res.ok || id !== fetchIdRef.current) return;
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      if (id === fetchIdRef.current) setFrameBitmap(bitmap);
    } catch { /* offline */ }

    if (id === fetchIdRef.current) setLoading(false);
  }, [canvasName, frameIndex]);

  // Fetch metadata when canvas changes
  useEffect(() => {
    if (!canvasName) { setMetadata(null); return; }
    setFrameIndex(0);
    fetch(`/api/canvas/${canvasName}`)
      .then((r) => r.json())
      .then(setMetadata)
      .catch(() => {});
  }, [canvasName]);

  // Fetch frame when canvas or index changes
  useEffect(() => { fetchFrame(); }, [fetchFrame]);

  // Re-fetch on WebSocket canvas:updated
  useEffect(() => {
    return subscribe('canvas:updated', (data: unknown) => {
      const d = data as { canvasName?: string };
      if (d.canvasName === canvasName) fetchFrame();
    });
  }, [canvasName, subscribe, fetchFrame]);

  return { metadata, frameBitmap, frameIndex, setFrameIndex, loading };
}
