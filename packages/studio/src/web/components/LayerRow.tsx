import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, UnlockIcon, CopyIcon } from './Icons';

interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'addition',
  'subtract',
];

interface LayerRowProps {
  layer: LayerInfo;
  active: boolean;
  canvasName: string;
  frameIndex: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<LayerInfo>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function LayerRow({
  layer,
  active,
  canvasName,
  frameIndex,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}: LayerRowProps) {
  const [showBlend, setShowBlend] = useState(false);

  return (
    <div
      className={`layer-row ${active ? 'layer-row--active' : ''}`}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        // Simple context: duplicate or delete
        if (confirm(`Delete layer "${layer.name}"?`)) onDelete();
      }}
    >
      <div className="layer-row__main">
        {/* Thumbnail */}
        <img
          className="layer-row__thumb"
          src={`/api/canvas/${canvasName}/layer/${layer.id}/frame/${frameIndex}/thumbnail`}
          alt={layer.name}
          width={24}
          height={24}
        />

        {/* Visibility toggle */}
        <button
          className={`layer-row__icon ${layer.visible ? '' : 'layer-row__icon--off'}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ visible: !layer.visible });
          }}
          title={layer.visible ? 'Hide' : 'Show'}
        >
          {layer.visible ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
        </button>

        {/* Lock toggle */}
        <button
          className={`layer-row__icon ${layer.locked ? 'layer-row__icon--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ locked: !layer.locked });
          }}
          title={layer.locked ? 'Unlock' : 'Lock'}
        >
          {layer.locked ? <LockIcon size={13} /> : <UnlockIcon size={13} />}
        </button>

        {/* Name */}
        <span className="layer-row__name">{layer.name}</span>

        {/* Duplicate button */}
        <button
          className="layer-row__icon"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
        >
          <CopyIcon size={13} />
        </button>
      </div>

      {/* Expanded controls for active layer */}
      {active && (
        <div className="layer-row__details">
          <label className="layer-row__control">
            <span>Blend</span>
            <select
              value={layer.blendMode}
              onChange={(e) => onUpdate({ blendMode: e.target.value } as Partial<LayerInfo>)}
              onClick={(e) => e.stopPropagation()}
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="layer-row__control">
            <span>Opacity</span>
            <input
              type="range"
              min={0}
              max={255}
              value={layer.opacity}
              onChange={(e) => onUpdate({ opacity: +e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="layer-row__value">{layer.opacity}</span>
          </label>
        </div>
      )}
    </div>
  );
}
