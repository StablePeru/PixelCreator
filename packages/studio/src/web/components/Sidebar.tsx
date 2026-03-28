import { useEffect, useState } from 'react';

interface SidebarProps {
  canvases: string[];
  selected: string | null;
  onSelect: (name: string) => void;
  onNewCanvas?: () => void;
}

interface CanvasInfo {
  width: number;
  height: number;
}

export function Sidebar({ canvases, selected, onSelect, onNewCanvas }: SidebarProps) {
  const [sizes, setSizes] = useState<Record<string, CanvasInfo>>({});

  useEffect(() => {
    for (const name of canvases) {
      if (sizes[name]) continue;
      fetch(`/api/canvas/${name}`)
        .then((r) => r.json())
        .then((data) => {
          setSizes((prev) => ({ ...prev, [name]: { width: data.width, height: data.height } }));
        })
        .catch(() => {});
    }
  }, [canvases]);

  return (
    <div className="sidebar">
      <div className="sidebar__header">Canvases ({canvases.length})</div>
      {canvases.map((name) => (
        <div
          key={name}
          className={`sidebar__item ${selected === name ? 'sidebar__item--active' : ''}`}
          onClick={() => onSelect(name)}
        >
          <span>{name}</span>
          {sizes[name] && (
            <span className="sidebar__item-size">
              {sizes[name].width}x{sizes[name].height}
            </span>
          )}
        </div>
      ))}
      {onNewCanvas && (
        <button className="sidebar__add-btn" onClick={onNewCanvas} title="New Canvas">
          + New Canvas
        </button>
      )}
    </div>
  );
}
