import { useState, useEffect, useRef } from 'react';

interface ExportPreviewProps {
  canvasName: string;
  format: 'png' | 'gif' | 'apng' | 'spritesheet' | 'svg';
  scale: number;
  frame: number;
  columns: number;
}

export function ExportPreview({ canvasName, format, scale, frame, columns }: ExportPreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    // Debounce preview generation to avoid hammering the server
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadPreview();
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [canvasName, format, scale, frame, columns]);

  async function loadPreview() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const previewScale = format === 'spritesheet' ? 1 : Math.min(scale, 4);

    if (format !== 'spritesheet') params.set('scale', String(previewScale));
    if (format === 'png' || format === 'svg') params.set('frame', String(frame));
    if (format === 'spritesheet') params.set('columns', String(columns));

    const url = `/api/export/preview/${format}/${canvasName}?${params}`;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Preview failed' }));
        setError(body.error || 'Preview failed');
        setLoading(false);
        return;
      }

      if (format === 'svg') {
        const svgText = await res.text();
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } else {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      }
      setLoading(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(String(err));
      setLoading(false);
    }
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const formatLabel = format === 'gif' ? 'GIF (animated)' :
    format === 'apng' ? 'APNG (animated)' :
    format === 'spritesheet' ? 'Spritesheet' :
    format.toUpperCase();

  return (
    <div className="export-preview">
      <div className="export-preview__label">{formatLabel}</div>

      <div className="export-preview__viewport">
        {loading && (
          <div className="export-preview__loading">Generating preview...</div>
        )}

        {error && (
          <div className="export-preview__error">{error}</div>
        )}

        {!loading && !error && src && (
          <img
            src={src}
            alt={`${format} preview`}
            className="export-preview__image"
            onLoad={handleImageLoad}
            style={{ imageRendering: format === 'svg' ? 'auto' : 'pixelated' }}
          />
        )}

        {!loading && !error && !src && (
          <div className="export-preview__placeholder">No preview</div>
        )}
      </div>

      {dimensions && (
        <div className="export-preview__info">
          {dimensions.w} x {dimensions.h}px
          {format === 'gif' || format === 'apng' ? ' (animated)' : ''}
        </div>
      )}
    </div>
  );
}
