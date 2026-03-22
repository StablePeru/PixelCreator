import { useTheme } from '../theme/ThemeProvider';
import { useTool } from '../context/ToolContext';
import { THEMES, THEME_LABELS, type ThemeName } from '../theme/themes';

interface StatusBarProps {
  canvasName: string | null;
  canvasSize: { w: number; h: number } | null;
  activeLayerName: string | null;
  frameIndex: number;
  frameCount: number;
  cursorPos: { x: number; y: number } | null;
  zoom: number;
}

export function StatusBar({ canvasName, canvasSize, activeLayerName, frameIndex, frameCount, cursorPos, zoom }: StatusBarProps) {
  const { activeTool } = useTool();
  const { theme, setTheme } = useTheme();

  const TOOL_LABELS: Record<string, string> = {
    pencil: 'Pencil (B)', line: 'Line (L)', rect: 'Rect (R)', circle: 'Circle (C)',
    fill: 'Fill (G)', eraser: 'Eraser (E)', marquee: 'Marquee (M)', wand: 'Wand (W)',
    move: 'Move (V)', polygon: 'Polygon (P)', gradient: 'Gradient (D)', bezier: 'Bezier (N)',
  };

  return (
    <div className="status-bar">
      <span className="status-bar__item">{TOOL_LABELS[activeTool] || activeTool}</span>
      {canvasName && (
        <>
          <span className="status-bar__sep">|</span>
          <span className="status-bar__item">{canvasName} {canvasSize ? `${canvasSize.w}x${canvasSize.h}` : ''}</span>
        </>
      )}
      {activeLayerName && (
        <>
          <span className="status-bar__sep">|</span>
          <span className="status-bar__item">Layer: {activeLayerName}</span>
        </>
      )}
      {frameCount > 1 && (
        <>
          <span className="status-bar__sep">|</span>
          <span className="status-bar__item">Frame {frameIndex + 1}/{frameCount}</span>
        </>
      )}
      <div className="status-bar__spacer" />
      {cursorPos && (
        <span className="status-bar__item status-bar__mono">({cursorPos.x}, {cursorPos.y})</span>
      )}
      <span className="status-bar__item status-bar__mono">{zoom}x</span>
      <span className="status-bar__sep">|</span>
      <select
        className="status-bar__theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
      >
        {(Object.keys(THEMES) as ThemeName[]).map((t) => (
          <option key={t} value={t}>{THEME_LABELS[t]}</option>
        ))}
      </select>
    </div>
  );
}
