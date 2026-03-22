interface ColorSwatchProps {
  color: string;
  size?: number;
  selected?: boolean;
  label?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function ColorSwatch({ color, size = 24, selected, label, onClick, onContextMenu }: ColorSwatchProps) {
  return (
    <div
      className={`swatch ${selected ? 'swatch--selected' : ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 2,
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={label || color}
    />
  );
}
