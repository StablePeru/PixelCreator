import { useRef, useEffect, useCallback, useState } from 'react';

interface TilemapEditorProps {
  tilesetName: string;
  tilemapName: string;
  mapWidth: number;
  mapHeight: number;
  tileWidth: number;
  tileHeight: number;
  selectedTile: number;
}

export function TilemapEditor({ tilesetName, tilemapName, mapWidth, mapHeight, tileWidth, tileHeight, selectedTile }: TilemapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderUrl, setRenderUrl] = useState('');

  const refresh = useCallback(() => {
    setRenderUrl(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/render?t=${Date.now()}`);
  }, [tilesetName, tilemapName]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);
    const cellX = Math.floor(px / tileWidth);
    const cellY = Math.floor(py / tileHeight);

    if (cellX < 0 || cellX >= mapWidth || cellY < 0 || cellY >= mapHeight) return;

    await fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/cell`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: cellX, y: cellY, tileIndex: selectedTile }),
    });
    refresh();
  }, [tilesetName, tilemapName, tileWidth, tileHeight, mapWidth, mapHeight, selectedTile, refresh]);

  // Draw rendered tilemap
  useEffect(() => {
    if (!renderUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      canvasRef.current.width = img.width;
      canvasRef.current.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= mapWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileWidth + 0.5, 0);
        ctx.lineTo(x * tileWidth + 0.5, mapHeight * tileHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= mapHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileHeight + 0.5);
        ctx.lineTo(mapWidth * tileWidth, y * tileHeight + 0.5);
        ctx.stroke();
      }
    };
    img.src = renderUrl;
  }, [renderUrl, mapWidth, mapHeight, tileWidth, tileHeight]);

  return (
    <div className="tilemap-editor">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ imageRendering: 'pixelated', cursor: 'crosshair', maxWidth: '100%' }}
      />
    </div>
  );
}
