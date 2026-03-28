import { useCallback, useState } from 'react';

interface TransformPanelProps {
  canvasName: string | null;
}

export function TransformPanel({ canvasName }: TransformPanelProps) {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [hueShiftDeg, setHueShiftDeg] = useState(0);
  const [posterizeLevels, setPosterizeLevels] = useState(4);
  const [showScale, setShowScale] = useState(false);
  const [scaleW, setScaleW] = useState(64);
  const [scaleH, setScaleH] = useState(64);
  const [scaleMethod, setScaleMethod] = useState<'nearest' | 'bilinear'>('nearest');

  const send = useCallback(
    async (endpoint: string, body: Record<string, unknown>) => {
      if (!canvasName) return;
      await fetch(`/api/transform/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas: canvasName, ...body }),
      });
    },
    [canvasName],
  );

  if (!canvasName) return null;

  const applySlider = async (
    endpoint: string,
    param: string,
    value: number,
    reset: (v: number) => void,
    neutral: number,
  ) => {
    if (value === neutral) return;
    await send(endpoint, { [param]: value });
    reset(neutral);
  };

  return (
    <div className="transform-panel">
      <div className="transform-panel__actions">
        <button
          className="transform-panel__btn"
          onClick={() => send('flip', { direction: 'h' })}
          title="Flip Horizontal"
        >
          Flip H
        </button>
        <button
          className="transform-panel__btn"
          onClick={() => send('flip', { direction: 'v' })}
          title="Flip Vertical"
        >
          Flip V
        </button>
        <button
          className="transform-panel__btn"
          onClick={() => send('rotate', { turns: 1 })}
          title="Rotate 90"
        >
          Rot 90
        </button>
        <button
          className="transform-panel__btn"
          onClick={() => send('invert', {})}
          title="Invert Colors"
        >
          Invert
        </button>
        <button
          className="transform-panel__btn"
          onClick={() => send('desaturate', { amount: 100 })}
          title="Desaturate"
        >
          Desat
        </button>
      </div>

      <div className="transform-panel__sliders">
        <div className="transform-panel__slider-row">
          <label>Brightness</label>
          <input
            type="range"
            min={-128}
            max={128}
            value={brightness}
            onChange={(e) => setBrightness(+e.target.value)}
          />
          <span className="transform-panel__value">{brightness}</span>
          <button
            className="transform-panel__apply"
            onClick={() => applySlider('brightness', 'amount', brightness, setBrightness, 0)}
            disabled={brightness === 0}
          >
            Apply
          </button>
        </div>

        <div className="transform-panel__slider-row">
          <label>Contrast</label>
          <input
            type="range"
            min={-128}
            max={128}
            value={contrast}
            onChange={(e) => setContrast(+e.target.value)}
          />
          <span className="transform-panel__value">{contrast}</span>
          <button
            className="transform-panel__apply"
            onClick={() => applySlider('contrast', 'amount', contrast, setContrast, 0)}
            disabled={contrast === 0}
          >
            Apply
          </button>
        </div>

        <div className="transform-panel__slider-row">
          <label>Hue Shift</label>
          <input
            type="range"
            min={-180}
            max={180}
            value={hueShiftDeg}
            onChange={(e) => setHueShiftDeg(+e.target.value)}
          />
          <span className="transform-panel__value">{hueShiftDeg}°</span>
          <button
            className="transform-panel__apply"
            onClick={() => applySlider('hue-shift', 'degrees', hueShiftDeg, setHueShiftDeg, 0)}
            disabled={hueShiftDeg === 0}
          >
            Apply
          </button>
        </div>

        <div className="transform-panel__slider-row">
          <label>Posterize</label>
          <input
            type="range"
            min={2}
            max={32}
            value={posterizeLevels}
            onChange={(e) => setPosterizeLevels(+e.target.value)}
          />
          <span className="transform-panel__value">{posterizeLevels}</span>
          <button
            className="transform-panel__apply"
            onClick={() => send('posterize', { levels: posterizeLevels })}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="transform-panel__scale-section">
        <button className="transform-panel__btn" onClick={() => setShowScale((v) => !v)}>
          {showScale ? '\u25BC' : '\u25B6'} Scale...
        </button>

        {showScale && (
          <div className="transform-panel__scale-form">
            <div className="transform-panel__scale-inputs">
              <label>
                W
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={scaleW}
                  onChange={(e) => setScaleW(Math.max(1, +e.target.value))}
                />
              </label>
              <label>
                H
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={scaleH}
                  onChange={(e) => setScaleH(Math.max(1, +e.target.value))}
                />
              </label>
            </div>
            <select
              value={scaleMethod}
              onChange={(e) => setScaleMethod(e.target.value as 'nearest' | 'bilinear')}
            >
              <option value="nearest">Nearest Neighbor</option>
              <option value="bilinear">Bilinear</option>
            </select>
            <button
              className="transform-panel__apply"
              onClick={() => send('scale', { width: scaleW, height: scaleH, method: scaleMethod })}
            >
              Apply Scale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
