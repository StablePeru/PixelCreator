import { useTool } from '../context/ToolContext';
import { useBrush } from '../context/BrushContext';
import type { ToolName } from '../tools/types';
import {
  PencilIcon,
  LineIcon,
  RectIcon,
  CircleIcon,
  FillIcon,
  EraserIcon,
  MarqueeIcon,
  WandIcon,
  MoveIcon,
  PolygonIcon,
  GradientIcon,
  BezierIcon,
  SymmetryOffIcon,
  SymmetryHIcon,
  SymmetryVIcon,
  SymmetryBothIcon,
  SymmetryRadialIcon,
  BrushPixelIcon,
  BrushCircleIcon,
  BrushDiamondIcon,
  BrushSquareIcon,
} from './Icons';

type IconComponent = (props: { size?: number; className?: string }) => JSX.Element;

const TOOLS: Array<{ name: ToolName; label: string; shortcut: string; icon: IconComponent }> = [
  { name: 'pencil', label: 'Pencil', shortcut: 'B', icon: PencilIcon },
  { name: 'line', label: 'Line', shortcut: 'L', icon: LineIcon },
  { name: 'rect', label: 'Rect', shortcut: 'R', icon: RectIcon },
  { name: 'circle', label: 'Circle', shortcut: 'C', icon: CircleIcon },
  { name: 'fill', label: 'Fill', shortcut: 'G', icon: FillIcon },
  { name: 'eraser', label: 'Eraser', shortcut: 'E', icon: EraserIcon },
  { name: 'marquee', label: 'Marquee', shortcut: 'M', icon: MarqueeIcon },
  { name: 'wand', label: 'Wand', shortcut: 'W', icon: WandIcon },
  { name: 'move', label: 'Move', shortcut: 'V', icon: MoveIcon },
  { name: 'polygon', label: 'Polygon', shortcut: 'P', icon: PolygonIcon },
  { name: 'gradient', label: 'Gradient', shortcut: 'D', icon: GradientIcon },
  { name: 'bezier', label: 'Bezier', shortcut: 'N', icon: BezierIcon },
];

const SYMMETRY_LABELS: Record<string, string> = {
  none: 'Off',
  horizontal: 'H',
  vertical: 'V',
  both: 'HV',
  radial: 'Rad',
};

const SYMMETRY_ICONS: Record<string, IconComponent> = {
  none: SymmetryOffIcon,
  horizontal: SymmetryHIcon,
  vertical: SymmetryVIcon,
  both: SymmetryBothIcon,
  radial: SymmetryRadialIcon,
};

function BrushShapeIcon({ shape, size: iconSize }: { shape: string; size: number }) {
  if (shape === 'circle') return <BrushCircleIcon size={iconSize} />;
  if (shape === 'diamond') return <BrushDiamondIcon size={iconSize} />;
  if (shape === 'square') return <BrushSquareIcon size={iconSize} />;
  return <BrushPixelIcon size={iconSize} />;
}

export function ToolBar() {
  const { activeTool, setActiveTool, fillMode, setFillMode, thickness, setThickness } = useTool();
  const { activeBrush, symmetry, cycleSymmetry } = useBrush();

  return (
    <div className="toolbar">
      <div className="toolbar__tools">
        {TOOLS.map((t, i) => (
          <>
            {i === 6 && <div key="sep-1" className="toolbar__separator" />}
            {i === 9 && <div key="sep-2" className="toolbar__separator" />}
            <button
              key={t.name}
              className={`toolbar__btn ${activeTool === t.name ? 'toolbar__btn--active' : ''}`}
              onClick={() => setActiveTool(t.name)}
              title={`${t.label} (${t.shortcut})`}
            >
              <t.icon size={15} className="toolbar__icon" />
              <span className="toolbar__shortcut">{t.shortcut}</span>
            </button>
          </>
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
          type="range"
          min={1}
          max={5}
          value={thickness}
          onChange={(e) => setThickness(+e.target.value)}
        />
        <span className="toolbar__value">{thickness}</span>
      </label>

      <div className="toolbar__separator" />

      <span className="toolbar__info" title="Active brush">
        <BrushShapeIcon shape={activeBrush.size <= 2 ? 'pixel' : activeBrush.shape} size={12} />
        <span>{activeBrush.name}</span>
        <span className="toolbar__value">{activeBrush.size}px</span>
      </span>

      <button
        className={`toolbar__btn toolbar__btn--symmetry ${symmetry.mode !== 'none' ? 'toolbar__btn--active' : ''}`}
        onClick={cycleSymmetry}
        title={`Symmetry: ${SYMMETRY_LABELS[symmetry.mode] ?? 'Off'} (S to toggle)`}
      >
        {(() => {
          const SymIcon = SYMMETRY_ICONS[symmetry.mode] ?? SymmetryOffIcon;
          return <SymIcon size={14} className="toolbar__icon" />;
        })()}
        <span className="toolbar__shortcut">S</span>
      </button>
    </div>
  );
}
