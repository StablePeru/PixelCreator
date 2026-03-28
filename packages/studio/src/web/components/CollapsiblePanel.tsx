import { useState, useCallback } from 'react';
import { ChevronRightIcon } from './Icons';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}

function getStorageKey(title: string): string {
  return `pxc-panel-${title.toLowerCase().replace(/\s+/g, '-')}`;
}

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  count,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(getStorageKey(title));
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(getStorageKey(title), String(next));
      return next;
    });
  }, [title]);

  return (
    <div className="panel">
      <button className="panel__header" onClick={toggle}>
        <ChevronRightIcon
          size={12}
          className={`panel__chevron ${open ? 'panel__chevron--open' : ''}`}
        />
        <span>{title}</span>
        {count !== undefined && <span className="panel__count">{count}</span>}
      </button>
      <div
        className={`panel__content ${open ? 'panel__content--expanded' : 'panel__content--collapsed'}`}
      >
        {children}
      </div>
    </div>
  );
}
