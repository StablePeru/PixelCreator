import { useState } from 'react';
import { useColor } from '../context/ColorContext';
import { useToast } from '../hooks/useToast';

type VisionDeficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface AccessibilityPanelProps {
  canvasName: string | null;
  paletteName: string | null;
  onSimulationChange: (deficiency: VisionDeficiency | null) => void;
  activeSimulation: VisionDeficiency | null;
}

const SIMULATIONS: Array<{ value: VisionDeficiency; label: string; desc: string }> = [
  { value: 'protanopia', label: 'Protan', desc: 'No red cones (~1% males)' },
  { value: 'deuteranopia', label: 'Deutan', desc: 'No green cones (~1% males)' },
  { value: 'tritanopia', label: 'Tritan', desc: 'No blue cones (~0.003%)' },
  { value: 'achromatopsia', label: 'Achrom', desc: 'Total color blindness' },
];

export function AccessibilityPanel({ canvasName, paletteName, onSimulationChange, activeSimulation }: AccessibilityPanelProps) {
  const { foreground, background } = useColor();
  const { toast } = useToast();
  const [contrastResult, setContrastResult] = useState<{ ratio: number; passAA: boolean; passAAA: boolean } | null>(null);
  const [paletteScore, setPaletteScore] = useState<number | null>(null);

  const checkContrast = async () => {
    try {
      const res = await fetch('/api/accessibility/contrast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foreground, background }),
      });
      const data = await res.json();
      setContrastResult({ ratio: data.ratio, passAA: data.passAA, passAAA: data.passAAA });
    } catch {
      toast('error', 'Failed to check contrast');
    }
  };

  const analyzePalette = async () => {
    if (!paletteName) return;
    try {
      const res = await fetch(`/api/palette/${paletteName}/accessibility`);
      const data = await res.json();
      setPaletteScore(data.score);
      toast('info', `Palette score: ${data.score}/100 (${data.issues.length} issues)`);
    } catch {
      toast('error', 'Failed to analyze palette');
    }
  };

  return (
    <div className="accessibility-panel">
      <div className="accessibility-panel__header">Accessibility</div>

      <div className="accessibility-panel__section">
        <div className="accessibility-panel__label">CVD Simulation</div>
        <div className="accessibility-panel__sims">
          <button
            className={`accessibility-panel__btn ${activeSimulation === null ? 'accessibility-panel__btn--active' : ''}`}
            onClick={() => onSimulationChange(null)}
          >
            Normal
          </button>
          {SIMULATIONS.map(s => (
            <button
              key={s.value}
              className={`accessibility-panel__btn ${activeSimulation === s.value ? 'accessibility-panel__btn--active' : ''}`}
              onClick={() => onSimulationChange(activeSimulation === s.value ? null : s.value)}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="accessibility-panel__section">
        <div className="accessibility-panel__label">Contrast Check</div>
        <div className="accessibility-panel__contrast">
          <div className="accessibility-panel__swatches">
            <span className="accessibility-panel__swatch" style={{ background: foreground }} title="Foreground" />
            <span className="accessibility-panel__swatch" style={{ background: background }} title="Background" />
          </div>
          <button className="accessibility-panel__btn" onClick={checkContrast}>Check</button>
          {contrastResult && (
            <span className="accessibility-panel__result">
              {contrastResult.ratio}:1
              <span className={contrastResult.passAA ? 'pass' : 'fail'}>{contrastResult.passAA ? ' AA' : ''}</span>
              <span className={contrastResult.passAAA ? 'pass' : 'fail'}>{contrastResult.passAAA ? ' AAA' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {paletteName && (
        <div className="accessibility-panel__section">
          <div className="accessibility-panel__label">Palette Report</div>
          <button className="accessibility-panel__btn" onClick={analyzePalette}>
            Analyze "{paletteName}"
          </button>
          {paletteScore !== null && (
            <span className="accessibility-panel__score">Score: {paletteScore}/100</span>
          )}
        </div>
      )}
    </div>
  );
}
