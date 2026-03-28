import { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface GamedevExportPanelProps {
  canvasName: string | null;
}

type Engine = 'godot' | 'unity' | 'generic';

interface CanvasInfo {
  canvas: string;
  width: number;
  height: number;
  frameCount: number;
  layerCount: number;
  animationTags: Array<{ name: string; from: number; to: number; direction: string }>;
}

export function GamedevExportPanel({ canvasName }: GamedevExportPanelProps) {
  const { toast } = useToast();
  const [engine, setEngine] = useState<Engine>('godot');
  const [scale, setScale] = useState(1);
  const [includeAnimations, setIncludeAnimations] = useState(true);
  const [info, setInfo] = useState<CanvasInfo | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchInfo = async () => {
    if (!canvasName) return;
    try {
      const res = await fetch(`/api/gamedev/info/${canvasName}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      } else {
        toast('error', 'Failed to fetch canvas info');
      }
    } catch {
      toast('error', 'Failed to fetch canvas info');
    }
  };

  const handleExport = async () => {
    if (!canvasName) return;
    setExporting(true);
    try {
      const res = await fetch('/api/gamedev/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas: canvasName, engine, scale, includeAnimations }),
      });
      if (res.ok) {
        const data = await res.json();
        toast('success', `Exported ${data.fileCount} files for ${engine}`);
      } else {
        toast('error', 'Export failed');
      }
    } catch {
      toast('error', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!canvasName) return null;

  return (
    <div className="gamedev-export-panel">
      <div className="gamedev-export-panel__header">Game Export</div>

      <div className="gamedev-export-panel__controls">
        <label>
          Engine
          <select value={engine} onChange={e => setEngine(e.target.value as Engine)}>
            <option value="godot">Godot</option>
            <option value="unity">Unity</option>
            <option value="generic">Generic</option>
          </select>
        </label>

        <label>
          Scale
          <select value={scale} onChange={e => setScale(Number(e.target.value))}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <label className="gamedev-export-panel__checkbox">
          <input
            type="checkbox"
            checked={includeAnimations}
            onChange={e => setIncludeAnimations(e.target.checked)}
          />
          Include Animations
        </label>

        <button
          className="gamedev-export-panel__export"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : `Export for ${engine.charAt(0).toUpperCase() + engine.slice(1)}`}
        </button>

        <button className="gamedev-export-panel__info" onClick={fetchInfo}>
          Show Info
        </button>
      </div>

      {info && (
        <div className="gamedev-export-panel__info-display">
          <div>Size: {info.width}x{info.height}</div>
          <div>Frames: {info.frameCount}</div>
          <div>Layers: {info.layerCount}</div>
          {info.animationTags.length > 0 && (
            <div>
              Tags:
              <ul>
                {info.animationTags.map(t => (
                  <li key={t.name}>{t.name} ({t.from}-{t.to}, {t.direction})</li>
                ))}
              </ul>
            </div>
          )}
          {info.animationTags.length === 0 && <div>Tags: none</div>}
        </div>
      )}
    </div>
  );
}
