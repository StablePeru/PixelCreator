import { useTool } from '../context/ToolContext';
import type { ToolName } from '../tools/types';

const TOOLS: Array<{ name: ToolName; label: string; shortcut: string; icon: string }> = [
  { name: 'pencil', label: 'Pencil', shortcut: 'B', icon: '/' },
  { name: 'line', label: 'Line', shortcut: 'L', icon: '\\' },
  { name: 'rect', label: 'Rect', shortcut: 'R', icon: '\u25A1' },
  { name: 'circle', label: 'Circle', shortcut: 'C', icon: '\u25CB' },
  { name: 'fill', label: 'Fill', shortcut: 'G', icon: '\u25A7' },
  { name: 'eraser', label: 'Eraser', shortcut: 'E', icon: '\u2395' },
  { name: 'marquee', label: 'Marquee', shortcut: 'M', icon: '\u25A2' },
  { name: 'wand', label: 'Wand', shortcut: 'W', icon: '\u2728' },
  { name: 'move', label: 'Move', shortcut: 'V', icon: '\u271A' },
  { name: 'polygon', label: 'Polygon', shortcut: 'P', icon: '\u2B23' },
  { name: 'gradient', label: 'Gradient', shortcut: 'D', icon: '\u25A4' },
  { name: 'bezier', label: 'Bezier', shortcut: 'N', icon: '\u223F' },
];

export function ToolBar() {
  const { activeTool, setActiveTool, fillMode, setFillMode, thickness, setThickness } = useTool();

  return (
    <div className="toolbar">
      <div className="toolbar__tools">
        {TOOLS.map((t) => (
          <button
            key={t.name}
            className={`toolbar__btn ${activeTool === t.name ? 'toolbar__btn--active' : ''}`}
            onClick={() => setActiveTool(t.name)}
            title={`${t.label} (${t.shortcut})`}
          >
            <span className="toolbar__icon">{t.icon}</span>
            <span className="toolbar__shortcut">{t.shortcut}</span>
          </button>
        ))}
      </div>

      <div className="toolbar__separator" />

      <label className="toolbar__option" title="Fill shapes">
        <input type="checkbox" checked={fillMode} onChange={(e) => setFillMode(e.target.checked)} />
        <span>Fill</span>
      </label>

      <label className="toolbar__option" title="Line thickness">
        <span>Thick</span>
        <input
          type="range" min={1} max={5} value={thickness}
          onChange={(e) => setThickness(+e.target.value)}
        />
        <span className="toolbar__value">{thickness}</span>
      </label>
    </div>
  );
}
