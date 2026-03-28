import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { EffectEditor } from './EffectEditor';

interface LayerEffect {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

interface EffectsPanelProps {
  canvasName: string | null;
  layerId: string | null;
}

const EFFECT_TYPES = [
  { value: 'drop-shadow', label: 'Drop Shadow' },
  { value: 'outer-glow', label: 'Outer Glow' },
  { value: 'outline', label: 'Outline' },
  { value: 'color-overlay', label: 'Color Overlay' },
];

const DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  'drop-shadow': { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, opacity: 128 },
  'outer-glow': { color: '#ffffff', radius: 2, intensity: 200 },
  outline: { color: '#000000', thickness: 1, position: 'outside' },
  'color-overlay': { color: '#ff0000', opacity: 128, blendMode: 'normal' },
};

export function EffectsPanel({ canvasName, layerId }: EffectsPanelProps) {
  const { toast } = useToast();
  const [effects, setEffects] = useState<LayerEffect[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!canvasName || !layerId) return;
    fetch(`/api/canvas/${canvasName}/layer/${layerId}/effects`)
      .then((r) => r.json())
      .then((data) => setEffects(data.effects ?? []))
      .catch(() => {});
  }, [canvasName, layerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEffect = async (type: string) => {
    if (!canvasName || !layerId) return;
    try {
      await fetch(`/api/canvas/${canvasName}/layer/${layerId}/effect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, params: DEFAULT_PARAMS[type] ?? {} }),
      });
      toast('success', `Added ${type} effect`);
      refresh();
    } catch {
      toast('error', 'Failed to add effect');
    }
  };

  const removeEffect = async (effectId: string) => {
    if (!canvasName || !layerId) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}/effect/${effectId}`, {
      method: 'DELETE',
    });
    refresh();
  };

  const toggleEffect = async (effectId: string) => {
    if (!canvasName || !layerId) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}/effect/${effectId}/toggle`, {
      method: 'PUT',
    });
    refresh();
  };

  const updateParams = async (effectId: string, params: Record<string, unknown>) => {
    if (!canvasName || !layerId) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}/effect/${effectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    refresh();
  };

  if (!canvasName || !layerId) return null;

  return (
    <div className="effects-panel">
      <div className="effects-panel__header">
        <select
          className="effects-panel__add"
          value=""
          onChange={(e) => {
            if (e.target.value) addEffect(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="">+ Add</option>
          {EFFECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {effects.map((fx) => (
        <div key={fx.id} className="effects-panel__item">
          <div className="effects-panel__row">
            <input type="checkbox" checked={fx.enabled} onChange={() => toggleEffect(fx.id)} />
            <span
              className="effects-panel__name"
              onClick={() => setExpandedId(expandedId === fx.id ? null : fx.id)}
            >
              {fx.type}
            </span>
            <button
              className="effects-panel__delete"
              onClick={() => removeEffect(fx.id)}
              title="Remove"
            >
              &times;
            </button>
          </div>
          {expandedId === fx.id && (
            <EffectEditor
              type={fx.type}
              params={fx.params}
              onChange={(params) => updateParams(fx.id, params)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
