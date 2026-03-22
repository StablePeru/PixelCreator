interface FrameThumbProps {
  canvasName: string;
  frameIndex: number;
  duration: number;
  active: boolean;
  label?: string;
  onClick: () => void;
}

export function FrameThumb({ canvasName, frameIndex, duration, active, label, onClick }: FrameThumbProps) {
  return (
    <div className={`frame-thumb ${active ? 'frame-thumb--active' : ''}`} onClick={onClick}>
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
