import { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface ProceduralPanelProps {
  canvasName: string | null;
}

type Mode = 'noise' | 'pattern';
type NoiseType = 'simplex' | 'fbm' | 'turbulence';
type PatternType = 'checkerboard' | 'stripes' | 'grid-dots' | 'brick';

export function ProceduralPanel({ canvasName }: ProceduralPanelProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('noise');
  const [noiseType, setNoiseType] = useState<NoiseType>('fbm');
  const [seed, setSeed] = useState(42);
  const [scale, setScale] = useState(0.08);
  const [octaves, setOctaves] = useState(4);
  const [patternType, setPatternType] = useState<PatternType>('checkerboard');

  const applyNoise = async () => {
    if (!canvasName) return;
    try {
      const res = await fetch('/api/generate/noise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas: canvasName,
          type: noiseType,
          seed, scale, octaves,
          lacunarity: 2.0, persistence: 0.5,
          mapping: { mode: 'grayscale' },
        }),
      });
      if (res.ok) toast('success', `${noiseType} noise applied`);
      else toast('error', 'Failed to generate noise');
    } catch { toast('error', 'Failed to generate noise'); }
  };

  const applyPattern = async () => {
    if (!canvasName) return;
    const options: Record<string, unknown> = {};
    switch (patternType) {
      case 'checkerboard': Object.assign(options, { cellSize: 4, color1: '#ffffff', color2: '#000000' }); break;
      case 'stripes': Object.assign(options, { direction: 'horizontal', widths: [2, 2], colors: ['#ffffff', '#000000'] }); break;
      case 'grid-dots': Object.assign(options, { spacingX: 4, spacingY: 4, dotSize: 1, color: '#ffffff', background: '#000000' }); break;
      case 'brick': Object.assign(options, { brickWidth: 8, brickHeight: 4, mortarSize: 1, brickColor: '#cc6633', mortarColor: '#888888', offset: 0.5 }); break;
    }
    try {
      const res = await fetch('/api/generate/pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas: canvasName, type: patternType, options }),
      });
      if (res.ok) toast('success', `${patternType} pattern applied`);
      else toast('error', 'Failed to generate pattern');
    } catch { toast('error', 'Failed'); }
  };

  if (!canvasName) return null;

  return (
    <div className="procedural-panel">
      <div className="procedural-panel__header">Procedural</div>

      <div className="procedural-panel__tabs">
        <button className={mode === 'noise' ? 'active' : ''} onClick={() => setMode('noise')}>Noise</button>
        <button className={mode === 'pattern' ? 'active' : ''} onClick={() => setMode('pattern')}>Pattern</button>
      </div>

      {mode === 'noise' && (
        <div className="procedural-panel__controls">
          <select value={noiseType} onChange={e => setNoiseType(e.target.value as NoiseType)}>
            <option value="simplex">Simplex</option>
            <option value="fbm">fBm</option>
            <option value="turbulence">Turbulence</option>
          </select>
          <label>Seed <input type="number" value={seed} onChange={e => setSeed(+e.target.value)} />
            <button onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}>Rnd</button>
          </label>
          <label>Scale <input type="range" min={1} max={50} value={scale * 100} onChange={e => setScale(+e.target.value / 100)} /> {scale.toFixed(2)}</label>
          <label>Octaves <input type="range" min={1} max={8} value={octaves} onChange={e => setOctaves(+e.target.value)} /> {octaves}</label>
          <button className="procedural-panel__apply" onClick={applyNoise}>Apply Noise</button>
        </div>
      )}

      {mode === 'pattern' && (
        <div className="procedural-panel__controls">
          <select value={patternType} onChange={e => setPatternType(e.target.value as PatternType)}>
            <option value="checkerboard">Checkerboard</option>
            <option value="stripes">Stripes</option>
            <option value="grid-dots">Grid Dots</option>
            <option value="brick">Brick</option>
          </select>
          <button className="procedural-panel__apply" onClick={applyPattern}>Apply Pattern</button>
        </div>
      )}
    </div>
  );
}
