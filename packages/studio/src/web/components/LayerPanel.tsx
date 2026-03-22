import { useCallback } from 'react';
import { LayerRow } from './LayerRow';

interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

interface LayerPanelProps {
  canvasName: string | null;
  layers: LayerInfo[];
  activeLayerId: string | null;
  frameIndex: number;
  onSelectLayer: (id: string) => void;
}

export function LayerPanel({ canvasName, layers, activeLayerId, frameIndex, onSelectLayer }: LayerPanelProps) {
  const addLayer = useCallback(async () => {
    if (!canvasName) return;
    await fetch(`/api/canvas/${canvasName}/layer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Layer ${layers.length + 1}` }),
    });
  }, [canvasName, layers.length]);

  const updateLayer = useCallback(async (layerId: string, updates: Partial<LayerInfo>) => {
    if (!canvasName) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }, [canvasName]);

  const deleteLayer = useCallback(async (layerId: string) => {
    if (!canvasName) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}`, { method: 'DELETE' });
  }, [canvasName]);

  const duplicateLayer = useCallback(async (layerId: string) => {
    if (!canvasName) return;
    await fetch(`/api/canvas/${canvasName}/layer/${layerId}/duplicate`, { method: 'POST' });
  }, [canvasName]);

  if (!canvasName) return null;

  // Display top layer first
  const sorted = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div className="layer-panel">
      <div className="layer-panel__header">
        <span>Layers ({layers.length})</span>
        <button className="layer-panel__add" onClick={addLayer} title="Add layer">+</button>
      </div>
      <div className="layer-panel__list">
        {sorted.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            active={layer.id === activeLayerId}
            canvasName={canvasName}
            frameIndex={frameIndex}
            onSelect={() => onSelectLayer(layer.id)}
            onUpdate={(updates) => updateLayer(layer.id, updates)}
            onDelete={() => deleteLayer(layer.id)}
            onDuplicate={() => duplicateLayer(layer.id)}
          />
        ))}
      </div>
    </div>
  );
}
