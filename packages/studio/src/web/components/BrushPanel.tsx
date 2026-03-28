import { useState } from 'react';
import { useBrush, type BrushPreset } from '../context/BrushContext';
import { BrushPixelIcon, BrushCircleIcon, BrushDiamondIcon, BrushSquareIcon } from './Icons';

type DitherMode = 'none' | 'ordered-2x2' | 'ordered-4x4' | 'ordered-8x8';

function BrushShapeIcon({ shape, size: iconSize }: { shape: string; size: number }) {
  if (shape === 'circle') return <BrushCircleIcon size={iconSize} />;
  if (shape === 'diamond') return <BrushDiamondIcon size={iconSize} />;
  if (shape === 'square') return <BrushSquareIcon size={iconSize} />;
  return <BrushPixelIcon size={iconSize} />;
}

export function BrushPanel() {
  const { presets, activeBrush, setActiveBrush, adjustBrushSize } = useBrush();
  const [paletteLock, setPaletteLock] = useState(false);
  const [ditherMode, setDitherMode] = useState<DitherMode>('none');

  return (
    <div className="brush-panel">
      <div className="brush-panel__grid">
        {presets.map((p) => (
          <button
            key={p.id}
            className={`brush-panel__btn ${activeBrush.id === p.id ? 'brush-panel__btn--active' : ''}`}
            onClick={() => setActiveBrush(p)}
            title={`${p.name} (${p.size}px ${p.shape})`}
          >
            <span className="brush-panel__preview">
              <BrushShapeIcon shape={p.size <= 2 ? 'pixel' : p.shape} size={12} />
            </span>
            <span className="brush-panel__name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="brush-panel__controls">
        <label className="brush-panel__slider">
          <span>Size</span>
          <input
            type="range"
            min={1}
            max={64}
            value={activeBrush.size}
            onChange={(e) => setActiveBrush({ ...activeBrush, size: +e.target.value })}
          />
          <span className="brush-panel__value">{activeBrush.size}px</span>
        </label>

        <label className="brush-panel__slider">
          <span>Opacity</span>
          <input
            type="range"
            min={0}
            max={255}
            value={activeBrush.opacity}
            onChange={(e) => setActiveBrush({ ...activeBrush, opacity: +e.target.value })}
          />
          <span className="brush-panel__value">{activeBrush.opacity}</span>
        </label>

        <label className="brush-panel__slider">
          <span>Spacing</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={activeBrush.spacing * 10}
            onChange={(e) => setActiveBrush({ ...activeBrush, spacing: +e.target.value / 10 })}
          />
          <span className="brush-panel__value">{activeBrush.spacing.toFixed(1)}</span>
        </label>

        <label className="brush-panel__checkbox">
          <input
            type="checkbox"
            checked={activeBrush.pixelPerfect}
            onChange={(e) => setActiveBrush({ ...activeBrush, pixelPerfect: e.target.checked })}
          />
          <span>Pixel Perfect</span>
        </label>

        <label className="brush-panel__checkbox">
          <input
            type="checkbox"
            checked={paletteLock}
            onChange={(e) => setPaletteLock(e.target.checked)}
          />
          <span>Palette Lock</span>
        </label>

        <label className="brush-panel__slider">
          <span>Dither Mode</span>
          <select value={ditherMode} onChange={(e) => setDitherMode(e.target.value as DitherMode)}>
            <option value="none">None</option>
            <option value="ordered-2x2">Ordered 2x2</option>
            <option value="ordered-4x4">Ordered 4x4</option>
            <option value="ordered-8x8">Ordered 8x8</option>
          </select>
        </label>
      </div>
    </div>
  );
}
