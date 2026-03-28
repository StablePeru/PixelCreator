import { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface CanvasCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

export function CanvasCreateDialog({ open, onClose, onCreated }: CanvasCreateDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('sprite');
  const [width, setWidth] = useState(32);
  const [height, setHeight] = useState(32);
  const [background, setBackground] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast('error', 'Canvas name is required');
      return;
    }
    try {
      const body: Record<string, unknown> = { name: name.trim(), width, height };
      if (background.trim()) body.background = background.trim();

      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast('success', `Canvas "${name}" created (${width}x${height})`);
        onCreated(name.trim());
        onClose();
      } else {
        const data = await res.json();
        toast('error', data.error || 'Failed to create canvas');
      }
    } catch {
      toast('error', 'Failed to create canvas');
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <h2>New Canvas</h2>
          <button className="dialog__close" onClick={onClose}>&times;</button>
        </div>
        <div className="dialog__body">
          <label className="dialog__field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <div className="dialog__row">
            <label className="dialog__field">
              <span>Width</span>
              <input type="number" min={1} max={4096} value={width} onChange={(e) => setWidth(+e.target.value)} />
            </label>
            <label className="dialog__field">
              <span>Height</span>
              <input type="number" min={1} max={4096} value={height} onChange={(e) => setHeight(+e.target.value)} />
            </label>
          </div>
          <label className="dialog__field">
            <span>Background (hex or empty for transparent)</span>
            <input type="text" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="#ffffff" />
          </label>
        </div>
        <div className="dialog__footer">
          <button className="dialog__btn" onClick={onClose}>Cancel</button>
          <button className="dialog__btn dialog__btn--primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
