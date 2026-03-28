interface IconProps {
  size?: number;
  className?: string;
}

const defaults = {
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// === Tool Icons ===

export function PencilIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M11.5 1.5l3 3-9 9H2.5v-3z" />
      <path d="M9.5 3.5l3 3" />
    </svg>
  );
}

export function LineIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <line x1="3" y1="13" x2="13" y2="3" />
    </svg>
  );
}

export function RectIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
    </svg>
  );
}

export function CircleIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  );
}

export function FillIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2.5 10.5l5-8 5 8a5 5 0 01-10 0z" />
    </svg>
  );
}

export function EraserIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M5 14h8M3.5 10.5l6-6 3 3-6 6-3.5.5z" />
      <path d="M9.5 4.5l3 3" />
    </svg>
  );
}

export function MarqueeIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="0.5" strokeDasharray="3 2" />
    </svg>
  );
}

export function WandIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2 14l8-8M10 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  );
}

export function MoveIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
    </svg>
  );
}

export function PolygonIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <polygon points="8,1.5 14,6 12,13.5 4,13.5 2,6" />
    </svg>
  );
}

export function GradientIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <line x1="6" y1="3" x2="6" y2="13" opacity="0.3" />
      <line x1="8" y1="3" x2="8" y2="13" opacity="0.5" />
      <line x1="10" y1="3" x2="10" y2="13" opacity="0.7" />
      <line x1="12" y1="3" x2="12" y2="13" opacity="0.9" />
    </svg>
  );
}

export function BezierIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2 12C2 4 14 12 14 4" />
      <circle cx="2" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// === Action Icons ===

export function UndoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M3 6h7a3 3 0 010 6H8" />
      <path d="M6 3L3 6l3 3" />
    </svg>
  );
}

export function RedoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M13 6H6a3 3 0 000 6h2" />
      <path d="M10 3l3 3-3 3" />
    </svg>
  );
}

export function ExportIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M8 2v8M5 5l3-3 3 3" />
      <path d="M3 10v3h10v-3" />
    </svg>
  );
}

export function ImportIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M8 10V2M5 7l3 3 3-3" />
      <path d="M3 10v3h10v-3" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

export function SettingsIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M6.8 1.5h2.4l.4 1.8.8.4 1.6-.8 1.7 1.7-.8 1.6.4.8 1.8.4v2.4l-1.8.4-.4.8.8 1.6-1.7 1.7-1.6-.8-.8.4-.4 1.8H6.8l-.4-1.8-.8-.4-1.6.8-1.7-1.7.8-1.6-.4-.8-1.8-.4V6.8l1.8-.4.4-.8-.8-1.6L4 2.3l1.6.8.8-.4z" />
    </svg>
  );
}

export function EyeIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function EyeOffIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2 2l12 12" />
      <path d="M6.5 6.5a2 2 0 002.8 2.8" />
      <path d="M4.2 4.2C2.5 5.6 1 8 1 8s2.5 5 7 5c1.4 0 2.6-.5 3.6-1.2" />
      <path d="M13.5 10.5C14.5 9.3 15 8 15 8s-2.5-5-7-5c-.5 0-1 .1-1.5.2" />
    </svg>
  );
}

export function LockIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="3.5" y="7" width="9" height="7" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </svg>
  );
}

export function UnlockIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="3.5" y="7" width="9" height="7" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0" />
    </svg>
  );
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 11V3h8" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2.5 4h11M5.5 4V2.5h5V4M6 6.5v5M8 6.5v5M10 6.5v5" />
      <path d="M3.5 4l.5 9.5h8l.5-9.5" />
    </svg>
  );
}

export function PlayIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <polygon points="4,2 13,8 4,14" />
    </svg>
  );
}

export function PauseIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
    </svg>
  );
}

export function StopIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
  );
}

export function StepBackIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <polygon points="10,2 4,8 10,14" />
      <rect x="3" y="3" width="1.5" height="10" />
    </svg>
  );
}

export function StepForwardIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <polygon points="6,2 12,8 6,14" />
      <rect x="11.5" y="3" width="1.5" height="10" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 8l3.5 4L13 4" />
    </svg>
  );
}

export function CrossIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WarningIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M8 1.5l6.5 12H1.5z" />
      <line x1="8" y1="6" x2="8" y2="9.5" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LoopIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <path d="M2 8a6 6 0 0110-4.5M14 8a6 6 0 01-10 4.5" />
      <path d="M12 1l0 4-4 0" />
      <path d="M4 15l0-4 4 0" />
    </svg>
  );
}

export function DatasetIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <rect x="2" y="2" width="5" height="5" rx="0.5" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" />
    </svg>
  );
}

// === Symmetry Icons ===

export function SymmetryOffIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <circle cx="8" cy="8" r="5" strokeDasharray="2 2" opacity="0.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

export function SymmetryHIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <line x1="8" y1="1" x2="8" y2="15" strokeDasharray="2 2" />
      <path d="M5 5l-2 3 2 3" />
      <path d="M11 5l2 3-2 3" />
    </svg>
  );
}

export function SymmetryVIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <line x1="1" y1="8" x2="15" y2="8" strokeDasharray="2 2" />
      <path d="M5 5l3-2 3 2" />
      <path d="M5 11l3 2 3-2" />
    </svg>
  );
}

export function SymmetryBothIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <line x1="8" y1="1" x2="8" y2="15" strokeDasharray="2 2" />
      <line x1="1" y1="8" x2="15" y2="8" strokeDasharray="2 2" />
      <circle cx="4.5" cy="4.5" r="1.5" />
      <circle cx="11.5" cy="4.5" r="1.5" />
      <circle cx="4.5" cy="11.5" r="1.5" />
      <circle cx="11.5" cy="11.5" r="1.5" />
    </svg>
  );
}

export function SymmetryRadialIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...defaults}
      className={className}
    >
      <circle cx="8" cy="8" r="5.5" />
      <line x1="8" y1="2" x2="8" y2="14" strokeDasharray="2 2" />
      <line x1="2" y1="8" x2="14" y2="8" strokeDasharray="2 2" />
      <line x1="3.8" y1="3.8" x2="12.2" y2="12.2" strokeDasharray="2 2" opacity="0.5" />
      <line x1="12.2" y1="3.8" x2="3.8" y2="12.2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );
}

// === Brush Shape Icons ===

export function BrushSquareIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <rect x="3" y="3" width="10" height="10" />
    </svg>
  );
}

export function BrushCircleIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <circle cx="8" cy="8" r="5" />
    </svg>
  );
}

export function BrushDiamondIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <polygon points="8,2 14,8 8,14 2,8" />
    </svg>
  );
}

export function BrushPixelIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <rect x="6" y="6" width="4" height="4" />
    </svg>
  );
}
