import { useRef, useEffect, useState, useCallback } from 'react';
import { useTool } from '../context/ToolContext';
import { useBrush } from '../context/BrushContext';
import type { PreviewShape } from '../tools/types';

interface CanvasViewProps {
  bitmap: ImageBitmap | null;
  canvasWidth: number;
  canvasHeight: number;
  onZoomChange: (zoom: number) => void;
  onCursorChange: (pos: { x: number; y: number } | null) => void;
  agentModeActive?: boolean;
}

export function CanvasView({ bitmap, canvasWidth, canvasHeight, onZoomChange, onCursorChange, agentModeActive = false }: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [toolActive, setToolActive] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [preview, setPreview] = useState<PreviewShape | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const { currentTool } = useTool();
  const { symmetry } = useBrush();

  function pixelCoord(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = Math.floor((e.clientX - rect.left - offset.x) / zoom);
    const py = Math.floor((e.clientY - rect.top - offset.y) / zoom);
    if (px >= 0 && px < canvasWidth && py >= 0 && py < canvasHeight) return { x: px, y: py };
    return null;
  }

  // Auto-fit zoom on first bitmap
  useEffect(() => {
    if (!bitmap || !containerRef.current) return;
    const container = containerRef.current;
    const maxZoomW = Math.floor(container.clientWidth * 0.8 / canvasWidth);
    const maxZoomH = Math.floor(container.clientHeight * 0.8 / canvasHeight);
    const fitZoom = Math.max(1, Math.min(maxZoomW, maxZoomH, 32));
    setZoom(fitZoom);
    setOffset({
      x: (container.clientWidth - canvasWidth * fitZoom) / 2,
      y: (container.clientHeight - canvasHeight * fitZoom) / 2,
    });
    onZoomChange(fitZoom);
  }, [bitmap !== null, canvasWidth, canvasHeight]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const container = containerRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!bitmap) return;

    const w = canvasWidth * zoom;
    const h = canvasHeight * zoom;
    const x = Math.floor(offset.x);
    const y = Math.floor(offset.y);

    // Checkerboard
    const checkSize = Math.max(4, zoom / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let cy2 = 0; cy2 < h; cy2 += checkSize) {
      for (let cx2 = 0; cx2 < w; cx2 += checkSize) {
        ctx.fillStyle = ((Math.floor(cx2 / checkSize) + Math.floor(cy2 / checkSize)) % 2) === 0 ? '#3a3a3a' : '#2a2a2a';
        ctx.fillRect(x + cx2, y + cy2, checkSize, checkSize);
      }
    }
    ctx.restore();

    // Bitmap
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, x, y, w, h);

    // Grid
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= canvasWidth; gx++) {
        const px = x + gx * zoom + 0.5;
        ctx.moveTo(px, y); ctx.lineTo(px, y + h);
      }
      for (let gy = 0; gy <= canvasHeight; gy++) {
        const py = y + gy * zoom + 0.5;
        ctx.moveTo(x, py); ctx.lineTo(x + w, py);
      }
      ctx.stroke();
    }

    // Tool preview overlay
    if (preview) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = preview.color;
      ctx.strokeStyle = preview.color;
      ctx.lineWidth = 2;

      if (preview.type === 'pixels' && preview.points) {
        for (const p of preview.points) {
          ctx.fillRect(x + p.x * zoom, y + p.y * zoom, zoom, zoom);
        }
      } else if (preview.type === 'line' && preview.x1 != null) {
        ctx.beginPath();
        ctx.moveTo(x + (preview.x1 + 0.5) * zoom, y + (preview.y1! + 0.5) * zoom);
        ctx.lineTo(x + (preview.x2! + 0.5) * zoom, y + (preview.y2! + 0.5) * zoom);
        ctx.stroke();
      } else if (preview.type === 'rect' && preview.x != null) {
        if (preview.fill) {
          ctx.fillRect(x + preview.x * zoom, y + preview.y! * zoom, preview.w! * zoom, preview.h! * zoom);
        } else {
          ctx.strokeRect(x + preview.x * zoom + 0.5, y + preview.y! * zoom + 0.5, preview.w! * zoom, preview.h! * zoom);
        }
      } else if (preview.type === 'circle' && preview.cx != null) {
        ctx.beginPath();
        ctx.arc(x + (preview.cx + 0.5) * zoom, y + (preview.cy! + 0.5) * zoom, preview.r! * zoom, 0, Math.PI * 2);
        preview.fill ? ctx.fill() : ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Symmetry guide lines
    if (symmetry && symmetry.mode !== 'none') {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.lineWidth = 1;

      const axisX = symmetry.axisX ?? Math.floor(canvasWidth / 2);
      const axisY = symmetry.axisY ?? Math.floor(canvasHeight / 2);

      if (symmetry.mode === 'horizontal' || symmetry.mode === 'both') {
        const gx = x + axisX * zoom + 0.5;
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
      }
      if (symmetry.mode === 'vertical' || symmetry.mode === 'both') {
        const gy = y + axisY * zoom + 0.5;
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
      }
      if (symmetry.mode === 'radial') {
        const cx2 = symmetry.radialCenterX ?? Math.floor(canvasWidth / 2);
        const cy2 = symmetry.radialCenterY ?? Math.floor(canvasHeight / 2);
        const segments = symmetry.radialSegments ?? 4;
        const centerX = x + cx2 * zoom;
        const centerY = y + cy2 * zoom;
        const maxR = Math.max(w, h);
        for (let i = 0; i < segments; i++) {
          const theta = (2 * Math.PI * i) / segments;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + maxR * Math.cos(theta), centerY + maxR * Math.sin(theta));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }, [bitmap, zoom, offset, canvasWidth, canvasHeight, showGrid, preview, symmetry]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(1, Math.min(32, zoom + (e.deltaY < 0 ? 1 : -1)));
    if (newZoom === zoom) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const pixelX = (mx - offset.x) / zoom, pixelY = (my - offset.y) / zoom;
    setOffset({ x: mx - pixelX * newZoom, y: my - pixelY * newZoom });
    setZoom(newZoom);
    onZoomChange(newZoom);
  }, [zoom, offset, onZoomChange]);

  // Mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan: middle click or shift+left
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setPanning(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      return;
    }
    // Tool: left click (no shift)
    if (e.button === 0 && !e.shiftKey && bitmap) {
      const pos = pixelCoord(e);
      if (pos) {
        setToolActive(true);
        currentTool.onStart(pos.x, pos.y);
        setPreview(currentTool.getPreview());
      }
    }
  }, [offset, bitmap, currentTool, zoom, canvasWidth, canvasHeight]);

  // Mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setOffset({
        x: dragStartRef.current.ox + (e.clientX - dragStartRef.current.x),
        y: dragStartRef.current.oy + (e.clientY - dragStartRef.current.y),
      });
      return;
    }
    const pos = pixelCoord(e);
    if (pos) {
      onCursorChange(pos);
      if (toolActive) {
        currentTool.onMove(pos.x, pos.y);
        setPreview(currentTool.getPreview());
      }
    } else {
      onCursorChange(null);
    }
  }, [panning, toolActive, offset, zoom, canvasWidth, canvasHeight, onCursorChange, currentTool]);

  // Mouse up
  const handleMouseUp = useCallback(() => {
    if (panning) { setPanning(false); return; }
    if (toolActive) {
      setToolActive(false);
      setPreview(null);
      currentTool.onEnd();
    }
  }, [panning, toolActive, currentTool]);

  const handleMouseLeave = useCallback(() => {
    setPanning(false);
    if (toolActive) {
      setToolActive(false);
      setPreview(null);
      currentTool.reset();
    }
    onCursorChange(null);
  }, [toolActive, currentTool, onCursorChange]);

  return (
    <div
      ref={containerRef}
      className={`canvas-area ${agentModeActive ? 'canvas-area--agent-mode' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: panning ? 'grabbing' : currentTool.cursor }}
    >
      {!bitmap ? (
        <div className="canvas-area__empty">Select a canvas from the sidebar</div>
      ) : (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      )}
      {agentModeActive && <div className="canvas-area__agent-badge">AGENT MODE</div>}
    </div>
  );
}
