import { useRef, useEffect } from 'react';

interface MinimapProps {
  bitmap: ImageBitmap | null;
  canvasWidth: number;
  canvasHeight: number;
  viewportRect: { x: number; y: number; w: number; h: number };
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_SIZE = 120;

export function Minimap({ bitmap, canvasWidth, canvasHeight, viewportRect, onNavigate }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    const scale = Math.min(MINIMAP_SIZE / canvasWidth, MINIMAP_SIZE / canvasHeight);
    const w = Math.floor(canvasWidth * scale);
    const h = Math.floor(canvasHeight * scale);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, w, h);

    // Canvas bitmap
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0, w, h);

    // Viewport rectangle
    const vx = viewportRect.x * scale;
    const vy = viewportRect.y * scale;
    const vw = viewportRect.w * scale;
    const vh = viewportRect.h * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx + 0.5, vy + 0.5, vw, vh);
  }, [bitmap, canvasWidth, canvasHeight, viewportRect]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(MINIMAP_SIZE / canvasWidth, MINIMAP_SIZE / canvasHeight);
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    onNavigate(px, py);
  };

  if (!bitmap) return null;

  return (
    <div className="minimap" title="Minimap — click to navigate">
      <canvas ref={canvasRef} onClick={handleClick} />
    </div>
  );
}
