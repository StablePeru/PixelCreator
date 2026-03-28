import { useRef, useEffect, useCallback, useState } from 'react';

interface TilemapCell {
  tileIndex: number;
  flipH?: boolean;
  flipV?: boolean;
  terrainId?: number;
}

interface TilemapData {
  name: string;
  width: number;
  height: number;
  cells: TilemapCell[];
}

type TilemapTool = 'paint' | 'fill' | 'erase';

interface TilemapEditorProps {
  tilesetName: string;
  tilemapName: string;
}

function tileColor(index: number): string {
  if (index < 0) return '#222233';
  return `hsl(${(index * 37) % 360}, 60%, 50%)`;
}

export function TilemapEditor({ tilesetName, tilemapName }: TilemapEditorProps) {
  const [tilemap, setTilemap] = useState<TilemapData | null>(null);
  const [selectedTile, setSelectedTile] = useState(0);
  const [tool, setTool] = useState<TilemapTool>('paint');
  const [brushSize, setBrushSize] = useState(1);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [undoState, setUndoState] = useState<TilemapData | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPaintedCellRef = useRef<{ x: number; y: number } | null>(null);
  const tileSize = 16;
  const zoom = 2;

  // --- Fetch tilemap data ---
  const fetchTilemap = useCallback(async () => {
    try {
      const res = await fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: 'Failed to fetch tilemap' }))) as {
          error?: string;
        };
        setError(body.error ?? 'Failed to fetch tilemap');
        return;
      }
      const data = (await res.json()) as TilemapData;
      setTilemap(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  }, [tilesetName, tilemapName]);

  useEffect(() => {
    fetchTilemap();
  }, [fetchTilemap]);

  // --- API helpers ---
  const applyPaint = useCallback(
    async (cellX: number, cellY: number) => {
      const res = await fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/brush-paint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: cellX, y: cellY, tileIndex: selectedTile, brushSize }),
      });
      if (res.ok) {
        const updated = (await res.json()) as TilemapData;
        setTilemap(updated);
      }
    },
    [tilesetName, tilemapName, selectedTile, brushSize],
  );

  const applyFill = useCallback(
    async (cellX: number, cellY: number) => {
      const res = await fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/flood-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: cellX, y: cellY, tileIndex: selectedTile }),
      });
      if (res.ok) {
        const updated = (await res.json()) as TilemapData;
        setTilemap(updated);
      }
    },
    [tilesetName, tilemapName, selectedTile],
  );

  const applyErase = useCallback(
    async (cellX: number, cellY: number) => {
      const res = await fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/erase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: cellX, y: cellY, brushSize }),
      });
      if (res.ok) {
        const updated = (await res.json()) as TilemapData;
        setTilemap(updated);
      }
    },
    [tilesetName, tilemapName, brushSize],
  );

  // --- Coordinate conversion ---
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      if (!tilemap || !canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const px = Math.floor((e.clientX - rect.left) * scaleX);
      const py = Math.floor((e.clientY - rect.top) * scaleY);
      const cellX = Math.floor(px / (tileSize * zoom));
      const cellY = Math.floor(py / (tileSize * zoom));
      if (cellX < 0 || cellX >= tilemap.width || cellY < 0 || cellY >= tilemap.height) return null;
      return { x: cellX, y: cellY };
    },
    [tilemap, tileSize, zoom],
  );

  // --- Tool application ---
  const applyTool = useCallback(
    async (cellX: number, cellY: number) => {
      if (tool === 'paint') {
        await applyPaint(cellX, cellY);
      } else if (tool === 'fill') {
        await applyFill(cellX, cellY);
      } else if (tool === 'erase') {
        await applyErase(cellX, cellY);
      }
    },
    [tool, applyPaint, applyFill, applyErase],
  );

  // --- Mouse handlers ---
  const handleMouseDown = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const cell = getCellFromEvent(e);
      if (!cell || !tilemap) return;

      // Save undo state before first paint stroke
      setUndoState({ ...tilemap, cells: tilemap.cells.map((c) => ({ ...c })) });
      setIsPainting(true);
      lastPaintedCellRef.current = cell;
      await applyTool(cell.x, cell.y);
    },
    [getCellFromEvent, tilemap, applyTool],
  );

  const handleMouseMove = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      setHoverCell(cell);

      if (!isPainting || !cell) return;

      // Avoid re-painting the same cell during drag
      const last = lastPaintedCellRef.current;
      if (last && last.x === cell.x && last.y === cell.y) return;

      lastPaintedCellRef.current = cell;

      // Fill tool only applies on mouse down, not drag
      if (tool === 'fill') return;

      await applyTool(cell.x, cell.y);
    },
    [getCellFromEvent, isPainting, tool, applyTool],
  );

  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    lastPaintedCellRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    setIsPainting(false);
    lastPaintedCellRef.current = null;
  }, []);

  // --- Undo ---
  const handleUndo = useCallback(async () => {
    if (!undoState) return;

    // Optimistic local restore, then sync changed cells to server
    setTilemap(undoState);
    setUndoState(null);

    if (!tilemap) return;
    const promises: Promise<void>[] = [];
    for (let i = 0; i < undoState.cells.length; i++) {
      if (undoState.cells[i].tileIndex !== tilemap.cells[i].tileIndex) {
        const x = i % undoState.width;
        const y = Math.floor(i / undoState.width);
        promises.push(
          fetch(`/api/tileset/${tilesetName}/tilemap/${tilemapName}/cell`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, tileIndex: undoState.cells[i].tileIndex }),
          }).then(() => undefined),
        );
      }
    }
    await Promise.all(promises);

    // Re-fetch to ensure server consistency
    await fetchTilemap();
  }, [undoState, tilemap, tilesetName, tilemapName, fetchTilemap]);

  // --- Canvas rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tilemap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelWidth = tilemap.width * tileSize * zoom;
    const pixelHeight = tilemap.height * tileSize * zoom;
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    // Draw cells
    for (let cy = 0; cy < tilemap.height; cy++) {
      for (let cx = 0; cx < tilemap.width; cx++) {
        const cell = tilemap.cells[cy * tilemap.width + cx];
        ctx.fillStyle = tileColor(cell.tileIndex);
        ctx.fillRect(cx * tileSize * zoom, cy * tileSize * zoom, tileSize * zoom, tileSize * zoom);

        // Show tile index in cell if not empty
        if (cell.tileIndex >= 0 && tileSize * zoom >= 20) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `${Math.max(9, tileSize * zoom * 0.35)}px var(--font-mono, monospace)`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(cell.tileIndex),
            cx * tileSize * zoom + (tileSize * zoom) / 2,
            cy * tileSize * zoom + (tileSize * zoom) / 2,
          );
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= tilemap.width; gx++) {
      const px = gx * tileSize * zoom + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, pixelHeight);
      ctx.stroke();
    }
    for (let gy = 0; gy <= tilemap.height; gy++) {
      const py = gy * tileSize * zoom + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(pixelWidth, py);
      ctx.stroke();
    }

    // Draw hover preview
    if (hoverCell) {
      const half = Math.floor(brushSize / 2);
      const previewHalf = tool === 'fill' ? 0 : half;

      ctx.fillStyle = tool === 'erase' ? 'rgba(232, 64, 64, 0.3)' : 'rgba(79, 195, 247, 0.3)';
      ctx.strokeStyle = tool === 'erase' ? 'rgba(232, 64, 64, 0.8)' : 'rgba(79, 195, 247, 0.8)';
      ctx.lineWidth = 2;

      const startX = Math.max(0, hoverCell.x - previewHalf);
      const startY = Math.max(0, hoverCell.y - previewHalf);
      const endX = Math.min(tilemap.width - 1, hoverCell.x + previewHalf);
      const endY = Math.min(tilemap.height - 1, hoverCell.y + previewHalf);

      const rx = startX * tileSize * zoom;
      const ry = startY * tileSize * zoom;
      const rw = (endX - startX + 1) * tileSize * zoom;
      const rh = (endY - startY + 1) * tileSize * zoom;

      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    }
  }, [tilemap, hoverCell, brushSize, tool, tileSize, zoom]);

  // --- Render ---
  if (error) {
    return (
      <div className="tilemap-editor">
        <div className="tilemap-editor__error">{error}</div>
      </div>
    );
  }

  if (!tilemap) {
    return (
      <div className="tilemap-editor">
        <div className="tilemap-editor__loading">Loading tilemap...</div>
      </div>
    );
  }

  return (
    <div className="tilemap-editor">
      <div className="tilemap-editor__toolbar">
        <div className="tilemap-editor__tools">
          <button
            className={`tilemap-editor__tool-btn ${tool === 'paint' ? 'tilemap-editor__tool-btn--active' : ''}`}
            onClick={() => setTool('paint')}
            title="Paint tile (P)"
          >
            Paint
          </button>
          <button
            className={`tilemap-editor__tool-btn ${tool === 'fill' ? 'tilemap-editor__tool-btn--active' : ''}`}
            onClick={() => setTool('fill')}
            title="Flood fill (F)"
          >
            Fill
          </button>
          <button
            className={`tilemap-editor__tool-btn ${tool === 'erase' ? 'tilemap-editor__tool-btn--active' : ''}`}
            onClick={() => setTool('erase')}
            title="Erase tile (E)"
          >
            Erase
          </button>
        </div>

        <div className="tilemap-editor__separator" />

        <div className="tilemap-editor__slider">
          <span>Brush</span>
          <input
            type="range"
            min={1}
            max={5}
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
          />
          <span className="tilemap-editor__value">{brushSize}</span>
        </div>

        <div className="tilemap-editor__separator" />

        <div className="tilemap-editor__tile-select">
          <span>Tile</span>
          <input
            type="number"
            min={0}
            value={selectedTile}
            onChange={(e) => setSelectedTile(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="tilemap-editor__tile-input"
          />
          <span
            className="tilemap-editor__tile-preview"
            style={{ backgroundColor: tileColor(selectedTile) }}
          />
        </div>

        <div className="tilemap-editor__separator" />

        <button
          className="tilemap-editor__tool-btn"
          onClick={handleUndo}
          disabled={!undoState}
          title="Undo last stroke (Ctrl+Z)"
        >
          Undo
        </button>
      </div>

      <div className="tilemap-editor__info">
        {tilemap.width}x{tilemap.height} cells
        {hoverCell ? ` | Cell: ${hoverCell.x}, ${hoverCell.y}` : ''}
        {hoverCell
          ? ` | Tile: ${tilemap.cells[hoverCell.y * tilemap.width + hoverCell.x]?.tileIndex ?? '-'}`
          : ''}
      </div>

      <div className="tilemap-editor__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="tilemap-editor__canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}
