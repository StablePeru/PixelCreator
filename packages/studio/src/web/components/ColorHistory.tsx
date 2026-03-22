import { ColorSwatch } from './ColorSwatch';

interface ColorHistoryProps {
  history: string[];
  onSelect: (hex: string) => void;
}

export function ColorHistory({ history, onSelect }: ColorHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="color-history">
      <div className="color-history__label">Recent</div>
      <div className="color-history__grid">
        {history.map((hex, i) => (
          <ColorSwatch key={`${hex}-${i}`} color={hex} size={16} onClick={() => onSelect(hex)} />
        ))}
      </div>
    </div>
  );
}
