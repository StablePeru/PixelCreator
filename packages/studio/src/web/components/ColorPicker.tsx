import { useState, useEffect, useCallback } from 'react';

// Client-side color conversion (simple, no API needed)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const [h, setH] = useState(hsl.h);
  const [s, setS] = useState(hsl.s);
  const [l, setL] = useState(hsl.l);
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    const newRgb = hslToRgb(h, s, l);
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(hex);
    onChange(hex);
  }, [h, s, l]);

  const handleHexChange = useCallback((val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const rgb = hexToRgb(val);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setH(hsl.h);
      setS(hsl.s);
      setL(hsl.l);
      onChange(val);
    }
  }, [onChange]);

  const currentRgb = hslToRgb(h, s, l);

  return (
    <div className="color-picker" onClick={(e) => e.stopPropagation()}>
      <div className="color-picker__header">
        <span>Color Picker</span>
        <button className="color-picker__close" onClick={onClose}>x</button>
      </div>

      <div className="color-picker__preview" style={{ backgroundColor: hexInput }} />

      <div className="color-picker__sliders">
        <label>
          <span>H</span>
          <input type="range" min={0} max={360} value={h} onChange={(e) => setH(+e.target.value)} />
          <span className="color-picker__value">{h}</span>
        </label>
        <label>
          <span>S</span>
          <input type="range" min={0} max={100} value={s} onChange={(e) => setS(+e.target.value)} />
          <span className="color-picker__value">{s}%</span>
        </label>
        <label>
          <span>L</span>
          <input type="range" min={0} max={100} value={l} onChange={(e) => setL(+e.target.value)} />
          <span className="color-picker__value">{l}%</span>
        </label>
      </div>

      <div className="color-picker__sliders">
        <label>
          <span>R</span>
          <input type="range" min={0} max={255} value={currentRgb.r}
            onChange={(e) => { const hsl = rgbToHsl(+e.target.value, currentRgb.g, currentRgb.b); setH(hsl.h); setS(hsl.s); setL(hsl.l); }} />
          <span className="color-picker__value">{currentRgb.r}</span>
        </label>
        <label>
          <span>G</span>
          <input type="range" min={0} max={255} value={currentRgb.g}
            onChange={(e) => { const hsl = rgbToHsl(currentRgb.r, +e.target.value, currentRgb.b); setH(hsl.h); setS(hsl.s); setL(hsl.l); }} />
          <span className="color-picker__value">{currentRgb.g}</span>
        </label>
        <label>
          <span>B</span>
          <input type="range" min={0} max={255} value={currentRgb.b}
            onChange={(e) => { const hsl = rgbToHsl(currentRgb.r, currentRgb.g, +e.target.value); setH(hsl.h); setS(hsl.s); setL(hsl.l); }} />
          <span className="color-picker__value">{currentRgb.b}</span>
        </label>
      </div>

      <div className="color-picker__hex">
        <span>Hex</span>
        <input type="text" value={hexInput} onChange={(e) => handleHexChange(e.target.value)} maxLength={7} />
      </div>
    </div>
  );
}
