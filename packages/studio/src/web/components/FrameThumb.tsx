interface FrameThumbProps {
  canvasName: string;
  frameIndex: number;
  duration: number;
  active: boolean;
  selected?: boolean;
  label?: string;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function FrameThumb({
  canvasName,
  frameIndex,
  duration,
  active,
  selected,
  label,
  onClick,
  onContextMenu,
}: FrameThumbProps) {
  const cls = `frame-thumb${active ? ' frame-thumb--active' : ''}${selected ? ' frame-thumb--selected' : ''}`;
  return (
    <div className={cls} onClick={onClick} onContextMenu={onContextMenu}>
      <img
        className="frame-thumb__img"
        src={`/api/canvas/${canvasName}/frame/${frameIndex}?scale=2`}
        alt={`Frame ${frameIndex}`}
        loading="lazy"
      />
      <div className="frame-thumb__index">{frameIndex + 1}</div>
      <div className="frame-thumb__duration">{duration}ms</div>
    </div>
  );
}
