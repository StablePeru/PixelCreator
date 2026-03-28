import { useToast } from '../hooks/useToast';

interface ReferencePanelProps {
  canvasName: string | null;
  referenceLayer: { id: string; name: string; opacity: number; visible: boolean } | null;
  onUpdate: () => void;
}

export function ReferencePanel({ canvasName, referenceLayer, onUpdate }: ReferencePanelProps) {
  const { toast } = useToast();

  if (!referenceLayer) return null;

  const updateRef = async (updates: Record<string, unknown>) => {
    if (!canvasName) return;
    try {
      await fetch(`/api/canvas/${canvasName}/layer/${referenceLayer.id}/reference`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      onUpdate();
    } catch {
      toast('error', 'Failed to update reference');
    }
  };

  return (
    <div className="reference-panel">
      <div className="reference-panel__header">Reference: {referenceLayer.name}</div>
      <label className="reference-panel__slider">
        <span>Opacity</span>
        <input
          type="range" min={0} max={255}
          value={referenceLayer.opacity}
          onChange={(e) => updateRef({ opacity: +e.target.value })}
        />
        <span className="reference-panel__value">{referenceLayer.opacity}</span>
      </label>
      <button
        className={`reference-panel__btn ${referenceLayer.visible ? '' : 'reference-panel__btn--off'}`}
        onClick={() => updateRef({ visible: !referenceLayer.visible })}
      >
        {referenceLayer.visible ? 'Visible' : 'Hidden'}
      </button>
    </div>
  );
}
