import { useState } from 'react';
import { useColor } from '../context/ColorContext';
import { usePalette } from '../hooks/usePalette';
import { ColorSwatch } from './ColorSwatch';
import { ColorHistory } from './ColorHistory';
import { ColorPicker } from './ColorPicker';

interface PalettePanelProps {
  palettes: string[];
}

export function PalettePanel({ palettes }: PalettePanelProps) {
  const { foreground, background, history, setForeground, setBackground, swap } = useColor();
  const [activePalette, setActivePalette] = useState(palettes[0] || null);
  const { palette } = usePalette(activePalette);
  const [showPicker, setShowPicker] = useState<'fg' | 'bg' | null>(null);

  return (
    <div className="palette-panel">
      {/* Palette selector */}
      {palettes.length > 0 && (
        <div className="palette-panel__selector">
          <select
            value={activePalette || ''}
            onChange={(e) => setActivePalette(e.target.value || null)}
          >
            {palettes.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Color swatches grid */}
      {palette && (
        <div className="palette-panel__grid">
          {palette.colors.map((color) => (
            <ColorSwatch
              key={color.index}
              color={color.hex}
              size={22}
              selected={color.hex === foreground}
              label={`${color.hex}${color.name ? ` (${color.name})` : ''}`}
              onClick={() => setForeground(color.hex)}
              onContextMenu={(e) => { e.preventDefault(); setBackground(color.hex); }}
            />
          ))}
        </div>
      )}

      {/* Active colors */}
      <div className="palette-panel__active">
        <div className="palette-panel__active-row" onDoubleClick={() => setShowPicker('fg')}>
          <span className="palette-panel__label">FG</span>
          <ColorSwatch color={foreground} size={28} />
          <span className="palette-panel__hex">{foreground}</span>
        </div>
        <button className="palette-panel__swap" onClick={swap} title="Swap colors (X)">&#x21C5;</button>
        <div className="palette-panel__active-row" onDoubleClick={() => setShowPicker('bg')}>
          <span className="palette-panel__label">BG</span>
          <ColorSwatch color={background} size={28} />
          <span className="palette-panel__hex">{background}</span>
        </div>
      </div>

      {/* Color Picker overlay */}
      {showPicker && (
        <div className="palette-panel__picker-overlay" onClick={() => setShowPicker(null)}>
          <ColorPicker
            color={showPicker === 'fg' ? foreground : background}
            onChange={showPicker === 'fg' ? setForeground : setBackground}
            onClose={() => setShowPicker(null)}
          />
        </div>
      )}

      {/* History */}
      <ColorHistory history={history} onSelect={setForeground} />
    </div>
  );
}
