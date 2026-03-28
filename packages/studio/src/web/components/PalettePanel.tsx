import { useState } from 'react';
import { useColor } from '../context/ColorContext';
import { usePalette } from '../hooks/usePalette';
import { ColorSwatch } from './ColorSwatch';
import { ColorHistory } from './ColorHistory';
import { ColorPicker } from './ColorPicker';

type RampInterpolation = 'rgb' | 'hsl' | 'oklch' | 'hue-shift';

interface RampFormState {
  interpolation: RampInterpolation;
  startColor: string;
  endColor: string;
  baseColor: string;
  steps: number;
  hueShift: number;
  satShift: number;
  lightStart: number;
  lightEnd: number;
}

const defaultRampForm: RampFormState = {
  interpolation: 'rgb',
  startColor: '#000000',
  endColor: '#ffffff',
  baseColor: '#4488cc',
  steps: 7,
  hueShift: 60,
  satShift: -0.2,
  lightStart: 0.15,
  lightEnd: 0.9,
};

interface PalettePanelProps {
  palettes: string[];
  canvasName: string | null;
}

export function PalettePanel({ palettes, canvasName }: PalettePanelProps) {
  const { foreground, background, history, setForeground, setBackground, swap } = useColor();
  const [activePalette, setActivePalette] = useState(palettes[0] || null);
  const { palette, addColors } = usePalette(activePalette);
  const [showPicker, setShowPicker] = useState<'fg' | 'bg' | null>(null);

  const [swapExpanded, setSwapExpanded] = useState(false);
  const [swapSource, setSwapSource] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [swapAllFrames, setSwapAllFrames] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const [rampExpanded, setRampExpanded] = useState(false);
  const [rampForm, setRampForm] = useState<RampFormState>(defaultRampForm);
  const [generatedColors, setGeneratedColors] = useState<string[]>([]);
  const [rampLoading, setRampLoading] = useState(false);
  const [rampError, setRampError] = useState<string | null>(null);

  const updateRampForm = (patch: Partial<RampFormState>) => {
    setRampForm((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerateRamp = async () => {
    if (!activePalette) return;
    setRampLoading(true);
    setRampError(null);

    const body: Record<string, unknown> = {
      interpolation: rampForm.interpolation,
      steps: rampForm.steps,
    };

    if (rampForm.interpolation === 'hue-shift') {
      body.baseHex = rampForm.baseColor;
      body.hueShift = rampForm.hueShift;
      body.saturationShift = rampForm.satShift;
      body.lightnessStart = rampForm.lightStart;
      body.lightnessEnd = rampForm.lightEnd;
    } else {
      body.startHex = rampForm.startColor;
      body.endHex = rampForm.endColor;
    }

    try {
      const res = await fetch(`/api/palette/${activePalette}/ramp-advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setRampError(data.error || 'Failed to generate ramp');
        setGeneratedColors([]);
      } else {
        setGeneratedColors(data.colors || []);
      }
    } catch {
      setRampError('Network error');
      setGeneratedColors([]);
    } finally {
      setRampLoading(false);
    }
  };

  const handleAddToPalette = async () => {
    if (generatedColors.length === 0) return;
    await addColors(generatedColors);
    setGeneratedColors([]);
  };

  const handleSwap = async () => {
    if (!swapSource || !swapTarget || !canvasName) return;
    setSwapLoading(true);
    setSwapError(null);
    try {
      const body: Record<string, unknown> = {
        canvasName,
        fromPalette: swapSource,
        toPalette: swapTarget,
      };
      if (!swapAllFrames) {
        body.allFrames = false;
      }
      const res = await fetch(`/api/palette/${swapSource}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setSwapError(data.error || 'Swap failed');
    } catch {
      setSwapError('Network error');
    } finally {
      setSwapLoading(false);
    }
  };

  const isHueShift = rampForm.interpolation === 'hue-shift';

  return (
    <div className="palette-panel">
      {/* Palette selector */}
      {palettes.length > 0 && (
        <div className="palette-panel__selector">
          <select
            value={activePalette || ''}
            onChange={(e) => setActivePalette(e.target.value || null)}
          >
            {palettes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Color swatches grid */}
      {palette && (
        <div className="palette-panel__grid">
          {palette.colors.map((color) => (
            <ColorSwatch
              key={color.index}
              color={color.hex}
              size={22}
              selected={color.hex === foreground}
              label={`${color.hex}${color.name ? ` (${color.name})` : ''}`}
              onClick={() => setForeground(color.hex)}
              onContextMenu={(e) => {
                e.preventDefault();
                setBackground(color.hex);
              }}
            />
          ))}
        </div>
      )}

      {/* Active colors */}
      <div className="palette-panel__active">
        <div className="palette-panel__active-row" onDoubleClick={() => setShowPicker('fg')}>
          <span className="palette-panel__label">FG</span>
          <ColorSwatch color={foreground} size={28} />
          <span className="palette-panel__hex">{foreground}</span>
        </div>
        <button className="palette-panel__swap" onClick={swap} title="Swap colors (X)">
          &#x21C5;
        </button>
        <div className="palette-panel__active-row" onDoubleClick={() => setShowPicker('bg')}>
          <span className="palette-panel__label">BG</span>
          <ColorSwatch color={background} size={28} />
          <span className="palette-panel__hex">{background}</span>
        </div>
      </div>

      {/* Color Picker overlay */}
      {showPicker && (
        <div className="palette-panel__picker-overlay" onClick={() => setShowPicker(null)}>
          <ColorPicker
            color={showPicker === 'fg' ? foreground : background}
            onChange={showPicker === 'fg' ? setForeground : setBackground}
            onClose={() => setShowPicker(null)}
          />
        </div>
      )}

      {/* History */}
      <ColorHistory history={history} onSelect={setForeground} />

      {/* Ramp Generator */}
      {activePalette && (
        <div className="palette-panel__ramp">
          <button className="palette-panel__ramp-toggle" onClick={() => setRampExpanded((v) => !v)}>
            <span style={{ marginRight: '4px' }}>{rampExpanded ? '\u25BC' : '\u25B6'}</span>
            Ramp Generator
          </button>

          {rampExpanded && (
            <div className="palette-panel__ramp-body">
              <label className="palette-panel__ramp-field">
                <span className="palette-panel__ramp-label">Mode</span>
                <select
                  value={rampForm.interpolation}
                  onChange={(e) =>
                    updateRampForm({ interpolation: e.target.value as RampInterpolation })
                  }
                >
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                  <option value="oklch">OKLCH</option>
                  <option value="hue-shift">Hue-Shift</option>
                </select>
              </label>

              {!isHueShift && (
                <>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Start</span>
                    <input
                      type="text"
                      value={rampForm.startColor}
                      onChange={(e) => updateRampForm({ startColor: e.target.value })}
                      placeholder="#000000"
                    />
                  </label>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">End</span>
                    <input
                      type="text"
                      value={rampForm.endColor}
                      onChange={(e) => updateRampForm({ endColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </label>
                </>
              )}

              {isHueShift && (
                <>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Base Color</span>
                    <input
                      type="text"
                      value={rampForm.baseColor}
                      onChange={(e) => updateRampForm({ baseColor: e.target.value })}
                      placeholder="#4488cc"
                    />
                  </label>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Hue Shift</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={rampForm.hueShift}
                      onChange={(e) => updateRampForm({ hueShift: +e.target.value })}
                    />
                    <span className="palette-panel__ramp-value">{rampForm.hueShift}</span>
                  </label>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Sat Shift</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={rampForm.satShift}
                      onChange={(e) => updateRampForm({ satShift: +e.target.value })}
                    />
                    <span className="palette-panel__ramp-value">
                      {rampForm.satShift.toFixed(1)}
                    </span>
                  </label>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Light Start</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={rampForm.lightStart}
                      onChange={(e) => updateRampForm({ lightStart: +e.target.value })}
                    />
                    <span className="palette-panel__ramp-value">
                      {rampForm.lightStart.toFixed(2)}
                    </span>
                  </label>
                  <label className="palette-panel__ramp-field">
                    <span className="palette-panel__ramp-label">Light End</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={rampForm.lightEnd}
                      onChange={(e) => updateRampForm({ lightEnd: +e.target.value })}
                    />
                    <span className="palette-panel__ramp-value">
                      {rampForm.lightEnd.toFixed(2)}
                    </span>
                  </label>
                </>
              )}

              <label className="palette-panel__ramp-field">
                <span className="palette-panel__ramp-label">Steps</span>
                <input
                  type="number"
                  min={2}
                  max={64}
                  value={rampForm.steps}
                  onChange={(e) =>
                    updateRampForm({ steps: Math.max(2, Math.min(64, +e.target.value)) })
                  }
                />
              </label>

              <button
                className="palette-panel__ramp-btn"
                onClick={handleGenerateRamp}
                disabled={rampLoading}
              >
                {rampLoading ? 'Generating...' : 'Generate'}
              </button>

              {rampError && <div className="palette-panel__ramp-error">{rampError}</div>}

              {generatedColors.length > 0 && (
                <div className="palette-panel__ramp-preview">
                  <div className="palette-panel__ramp-swatches">
                    {generatedColors.map((hex, i) => (
                      <ColorSwatch
                        key={`${hex}-${i}`}
                        color={hex}
                        size={20}
                        onClick={() => setForeground(hex)}
                      />
                    ))}
                  </div>
                  <button className="palette-panel__ramp-btn" onClick={handleAddToPalette}>
                    Add to Palette
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Palette Swap */}
      {activePalette && canvasName && (
        <div className="palette-panel__swap-section">
          <button className="palette-panel__ramp-toggle" onClick={() => setSwapExpanded((v) => !v)}>
            <span style={{ marginRight: '4px' }}>{swapExpanded ? '\u25BC' : '\u25B6'}</span>
            Palette Swap
          </button>

          {swapExpanded && (
            <div className="palette-panel__swap-body">
              <label className="palette-panel__ramp-field">
                <span className="palette-panel__ramp-label">Source</span>
                <select
                  value={swapSource || ''}
                  onChange={(e) => setSwapSource(e.target.value || null)}
                >
                  <option value="">-- select --</option>
                  {palettes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="palette-panel__ramp-field">
                <span className="palette-panel__ramp-label">Target</span>
                <select
                  value={swapTarget || ''}
                  onChange={(e) => setSwapTarget(e.target.value || null)}
                >
                  <option value="">-- select --</option>
                  {palettes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="palette-panel__swap-check">
                <input
                  type="checkbox"
                  checked={swapAllFrames}
                  onChange={(e) => setSwapAllFrames(e.target.checked)}
                />
                <span>Apply to all frames</span>
              </label>

              <button
                className="palette-panel__ramp-btn"
                onClick={handleSwap}
                disabled={swapLoading || !swapSource || !swapTarget}
              >
                {swapLoading ? 'Swapping...' : 'Apply Swap'}
              </button>

              {swapError && <div className="palette-panel__ramp-error">{swapError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
