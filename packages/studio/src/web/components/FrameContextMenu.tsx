import { useEffect, useRef } from 'react';

interface FrameContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  onDeleteSelected: () => void;
  onSetDuration: () => void;
  onDuplicateSelected: () => void;
  onClose: () => void;
}

export function FrameContextMenu({
  x,
  y,
  selectedCount,
  onDeleteSelected,
  onSetDuration,
  onDuplicateSelected,
  onClose,
}: FrameContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - 120),
    zIndex: 100,
  };

  return (
    <div className="frame-context-menu" ref={ref} style={style}>
      <div className="frame-context-menu__item" onClick={onDeleteSelected}>
        Delete Selected ({selectedCount})
      </div>
      <div className="frame-context-menu__item" onClick={onSetDuration}>
        Set Duration...
      </div>
      <div className="frame-context-menu__item" onClick={onDuplicateSelected}>
        Duplicate
      </div>
    </div>
  );
}
