import { useBrush, type BrushPreset } from '../context/BrushContext';

export function BrushPanel() {
  const { presets, activeBrush, setActiveBrush, adjustBrushSize } = useBrush();

  return (
    <div className="brush-panel">
      <div className="brush-panel__header">Brushes</div>

      <div className="brush-panel__grid">
        {presets.map((p) => (
          <button
            key={p.id}
            className={`brush-panel__btn ${activeBrush.id === p.id ? 'brush-panel__btn--active' : ''}`}
            onClick={() => setActiveBrush(p)}
            title={`${p.name} (${p.size}px ${p.shape})`}
          >
            <span className="brush-panel__preview">{p.size <= 2 ? '\u25AA' : p.shape === 'circle' ? '\u25CF' : p.shape === 'diamond' ? '\u25C6' : '\u25A0'}</span>
            <span className="brush-panel__name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="brush-panel__controls">
        <label className="brush-panel__slider">
          <span>Size</span>
          <input
            type="range" min={1} max={64}
            value={activeBrush.size}
            onChange={(e) => setActiveBrush({ ...activeBrush, size: +e.target.value })}
          />
          <span className="brush-panel__value">{activeBrush.size}px</span>
        </label>

        <label className="brush-panel__slider">
          <span>Opacity</span>
          <input
            type="range" min={0} max={255}
            value={activeBrush.opacity}
            onChange={(e) => setActiveBrush({ ...activeBrush, opacity: +e.target.value })}
          />
          <span className="brush-panel__value">{activeBrush.opacity}</span>
        </label>

        <label className="brush-panel__slider">
          <span>Spacing</span>
          <input
            type="range" min={1} max={30} step={1}
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
      </div>
    </div>
  );
}
