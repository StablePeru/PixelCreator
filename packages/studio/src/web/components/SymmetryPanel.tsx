import { useBrush, type SymmetryMode } from '../context/BrushContext';

const MODES: Array<{ value: SymmetryMode; label: string; icon: string }> = [
  { value: 'none', label: 'Off', icon: '\u2205' },
  { value: 'horizontal', label: 'H-Mirror', icon: '\u2194' },
  { value: 'vertical', label: 'V-Mirror', icon: '\u2195' },
  { value: 'both', label: 'Both', icon: '\u271A' },
  { value: 'radial', label: 'Radial', icon: '\u2742' },
];

const RADIAL_OPTIONS = [4, 6, 8, 12];

export function SymmetryPanel() {
  const { symmetry, setSymmetry } = useBrush();

  return (
    <div className="symmetry-panel">
      <div className="symmetry-panel__header">Symmetry</div>

      <div className="symmetry-panel__modes">
        {MODES.map((m) => (
          <button
            key={m.value}
            className={`symmetry-panel__btn ${symmetry.mode === m.value ? 'symmetry-panel__btn--active' : ''}`}
            onClick={() => setSymmetry({ ...symmetry, mode: m.value })}
            title={m.label}
          >
            <span>{m.icon}</span>
            <span className="symmetry-panel__label">{m.label}</span>
          </button>
        ))}
      </div>

      {symmetry.mode !== 'none' && symmetry.mode !== 'radial' && (
        <div className="symmetry-panel__axes">
          {(symmetry.mode === 'horizontal' || symmetry.mode === 'both') && (
            <label className="symmetry-panel__input">
              <span>Axis X</span>
              <input
                type="number" min={0}
                value={symmetry.axisX ?? 0}
                onChange={(e) => setSymmetry({ ...symmetry, axisX: +e.target.value })}
              />
            </label>
          )}
          {(symmetry.mode === 'vertical' || symmetry.mode === 'both') && (
            <label className="symmetry-panel__input">
              <span>Axis Y</span>
              <input
                type="number" min={0}
                value={symmetry.axisY ?? 0}
                onChange={(e) => setSymmetry({ ...symmetry, axisY: +e.target.value })}
              />
            </label>
          )}
        </div>
      )}

      {symmetry.mode === 'radial' && (
        <div className="symmetry-panel__radial">
          <label className="symmetry-panel__input">
            <span>Segments</span>
            <select
              value={symmetry.radialSegments ?? 4}
              onChange={(e) => setSymmetry({ ...symmetry, radialSegments: +e.target.value })}
            >
              {RADIAL_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
