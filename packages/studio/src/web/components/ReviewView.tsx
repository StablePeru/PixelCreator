import { useEffect, useRef, useState } from 'react';
import { useCanvasLive } from '../hooks/useCanvasLive';
import { useValidation } from '../hooks/useValidation';
import { ValidationPanel } from './ValidationPanel';

interface Props {
  canvases: string[];
  selectedCanvas: string | null;
  onSelectCanvas: (name: string) => void;
  subscribe: (event: string, cb: (data: unknown) => void) => () => void;
  onBackToEditor: () => void;
}

export function ReviewView({
  canvases,
  selectedCanvas,
  onSelectCanvas,
  subscribe,
  onBackToEditor,
}: Props) {
  const { metadata, frameBitmap, frameIndex, setFrameIndex } = useCanvasLive(
    selectedCanvas,
    subscribe,
  );
  const { flags, report, createFlag, resolveFlagById, removeFlagById, runReport } = useValidation(
    selectedCanvas,
    subscribe,
  );

  const [selectedRegion, setSelectedRegion] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  useEffect(() => {
    if (metadata?.layers?.length) setActiveLayerId(metadata.layers[0].id);
    else setActiveLayerId(null);
  }, [metadata?.name]);

  return (
    <div style={shellStyle}>
      <div style={toolbarStyle}>
        <button onClick={onBackToEditor} style={backBtnStyle}>
          ← Back to Editor
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, opacity: 0.8 }}>
          Review mode — read-only. Flag issues; the agent reads them via{' '}
          <code>pxc validation:list --output json</code>.
        </div>
      </div>

      <div style={bodyStyle}>
        <div style={leftColStyle}>
          <div style={sectionTitleStyle}>Canvases</div>
          {canvases.length === 0 && <div style={dimStyle}>No canvases yet.</div>}
          {canvases.map((name) => (
            <button
              key={name}
              onClick={() => onSelectCanvas(name)}
              style={{
                ...canvasBtnStyle,
                ...(name === selectedCanvas ? activeBtnStyle : {}),
              }}
            >
              {name}
            </button>
          ))}

          {metadata && (
            <>
              <div style={sectionTitleStyle}>Frames ({metadata.frames.length})</div>
              {metadata.frames.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setFrameIndex(i)}
                  style={{
                    ...canvasBtnStyle,
                    ...(i === frameIndex ? activeBtnStyle : {}),
                  }}
                >
                  {f.label ?? `frame-${String(i + 1).padStart(3, '0')}`}
                </button>
              ))}

              <div style={sectionTitleStyle}>Layers ({metadata.layers.length})</div>
              {metadata.layers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLayerId(l.id)}
                  style={{
                    ...canvasBtnStyle,
                    ...(l.id === activeLayerId ? activeBtnStyle : {}),
                  }}
                >
                  {l.name} {l.visible ? '' : '(hidden)'}
                </button>
              ))}
            </>
          )}
        </div>

        <div style={centerColStyle}>
          <PreviewCanvas
            bitmap={frameBitmap}
            width={metadata?.width ?? 0}
            height={metadata?.height ?? 0}
            flagRegions={flags
              .filter((f) => !f.resolvedAt && f.frameIndex === frameIndex && f.region)
              .map((f) => ({ region: f.region!, severity: f.severity }))}
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
          />
        </div>

        <ValidationPanel
          canvasName={selectedCanvas}
          frameIndex={frameIndex}
          activeLayerId={activeLayerId}
          flags={flags}
          report={report}
          selectedRegion={selectedRegion}
          onCreate={async (input) => {
            await createFlag(input);
          }}
          onResolve={resolveFlagById}
          onRemove={removeFlagById}
          onRunReport={runReport}
          onClearRegion={() => setSelectedRegion(null)}
        />
      </div>
    </div>
  );
}

interface PreviewCanvasProps {
  bitmap: ImageBitmap | null;
  width: number;
  height: number;
  flagRegions: { region: { x: number; y: number; w: number; h: number }; severity: string }[];
  selectedRegion: { x: number; y: number; w: number; h: number } | null;
  onRegionSelect: (r: { x: number; y: number; w: number; h: number } | null) => void;
}

function PreviewCanvas({
  bitmap,
  width,
  height,
  flagRegions,
  selectedRegion,
  onRegionSelect,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const scale = width > 0 ? Math.max(1, Math.floor(Math.min(512 / width, 512 / height))) : 1;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !bitmap) return;
    el.width = width * scale;
    el.height = height * scale;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(bitmap, 0, 0, el.width, el.height);

    for (const { region, severity } of flagRegions) {
      ctx.strokeStyle =
        severity === 'error' ? '#ff4040' : severity === 'warning' ? '#ffa040' : '#40a0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(region.x * scale, region.y * scale, region.w * scale, region.h * scale);
    }

    if (selectedRegion) {
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        selectedRegion.x * scale,
        selectedRegion.y * scale,
        selectedRegion.w * scale,
        selectedRegion.h * scale,
      );
      ctx.setLineDash([]);
    }
  }, [bitmap, width, height, scale, flagRegions, selectedRegion]);

  const toPixel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / scale),
      y: Math.floor((e.clientY - rect.top) / scale),
    };
  };

  return (
    <div style={previewWrapStyle}>
      {bitmap ? (
        <canvas
          ref={canvasRef}
          style={{ imageRendering: 'pixelated', cursor: 'crosshair', border: '1px solid #333' }}
          onMouseDown={(e) => setDragStart(toPixel(e))}
          onMouseMove={(e) => {
            if (!dragStart) return;
            const now = toPixel(e);
            const x = Math.min(dragStart.x, now.x);
            const y = Math.min(dragStart.y, now.y);
            const w = Math.abs(now.x - dragStart.x) + 1;
            const h = Math.abs(now.y - dragStart.y) + 1;
            onRegionSelect({ x, y, w, h });
          }}
          onMouseUp={() => setDragStart(null)}
          onMouseLeave={() => setDragStart(null)}
        />
      ) : (
        <div style={dimStyle}>No canvas selected.</div>
      )}
      <div style={{ ...dimStyle, marginTop: 8 }}>
        {width > 0 && `${width}×${height} @ ${scale}x — click-drag to select a region`}
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: 'var(--bg, #0f0f0f)',
  color: 'var(--text, #eee)',
};
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  gap: 12,
};
const backBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--accent, #4a90e2)',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const bodyStyle: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' };
const leftColStyle: React.CSSProperties = {
  width: 200,
  padding: 12,
  borderRight: '1px solid #333',
  overflowY: 'auto',
};
const centerColStyle: React.CSSProperties = {
  flex: 1,
  padding: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'auto',
};
const previewWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
const sectionTitleStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 4,
  fontSize: 11,
  opacity: 0.6,
  textTransform: 'uppercase',
};
const canvasBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '4px 8px',
  marginBottom: 2,
  background: 'transparent',
  color: 'inherit',
  border: '1px solid transparent',
  borderRadius: 3,
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 12,
};
const activeBtnStyle: React.CSSProperties = {
  background: 'rgba(74, 144, 226, 0.2)',
  border: '1px solid var(--accent, #4a90e2)',
};
const dimStyle: React.CSSProperties = { opacity: 0.6, fontSize: 12 };
