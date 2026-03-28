import { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';

interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Prefs {
  showGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  snapToGuide: boolean;
  snapThreshold: number;
  defaultCanvasWidth: number;
  defaultCanvasHeight: number;
  defaultBackground: string | null;
}

const DEFAULTS: Prefs = {
  showGrid: true,
  gridSize: 1,
  showGuides: true,
  snapToGuide: true,
  snapThreshold: 4,
  defaultCanvasWidth: 32,
  defaultCanvasHeight: 32,
  defaultBackground: null,
};

export function PreferencesDialog({ open, onClose }: PreferencesDialogProps) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (!open) return;
    fetch('/api/project/preferences')
      .then(r => r.json())
      .then(data => setPrefs({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, [open]);

  const save = async () => {
    try {
      await fetch('/api/project/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      toast('success', 'Preferences saved');
      onClose();
    } catch {
      toast('error', 'Failed to save preferences');
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <h2>Preferences</h2>
          <button className="dialog__close" onClick={onClose}>&times;</button>
        </div>

        <div className="dialog__body">
          <fieldset className="dialog__section">
            <legend>Grid & Guides</legend>
            <label className="dialog__field">
              <input type="checkbox" checked={prefs.showGrid} onChange={e => setPrefs(p => ({ ...p, showGrid: e.target.checked }))} />
              <span>Show Grid</span>
            </label>
            <label className="dialog__field">
              <span>Grid Size</span>
              <input type="number" min={1} max={32} value={prefs.gridSize} onChange={e => setPrefs(p => ({ ...p, gridSize: +e.target.value }))} />
            </label>
            <label className="dialog__field">
              <input type="checkbox" checked={prefs.showGuides} onChange={e => setPrefs(p => ({ ...p, showGuides: e.target.checked }))} />
              <span>Show Guides</span>
            </label>
            <label className="dialog__field">
              <input type="checkbox" checked={prefs.snapToGuide} onChange={e => setPrefs(p => ({ ...p, snapToGuide: e.target.checked }))} />
              <span>Snap to Guides</span>
            </label>
            <label className="dialog__field">
              <span>Snap Threshold</span>
              <input type="number" min={1} max={32} value={prefs.snapThreshold} onChange={e => setPrefs(p => ({ ...p, snapThreshold: +e.target.value }))} />
            </label>
          </fieldset>

          <fieldset className="dialog__section">
            <legend>Canvas Defaults</legend>
            <label className="dialog__field">
              <span>Default Width</span>
              <input type="number" min={1} max={4096} value={prefs.defaultCanvasWidth} onChange={e => setPrefs(p => ({ ...p, defaultCanvasWidth: +e.target.value }))} />
            </label>
            <label className="dialog__field">
              <span>Default Height</span>
              <input type="number" min={1} max={4096} value={prefs.defaultCanvasHeight} onChange={e => setPrefs(p => ({ ...p, defaultCanvasHeight: +e.target.value }))} />
            </label>
          </fieldset>
        </div>

        <div className="dialog__footer">
          <button className="dialog__btn" onClick={onClose}>Cancel</button>
          <button className="dialog__btn dialog__btn--primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
