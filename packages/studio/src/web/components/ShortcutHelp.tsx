interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Tools', items: [
    ['B', 'Pencil'], ['L', 'Line'], ['R', 'Rectangle'], ['C', 'Circle'],
    ['G', 'Fill'], ['E', 'Eraser'], ['M', 'Marquee Select'], ['W', 'Magic Wand'],
    ['V', 'Move'], ['P', 'Polygon'], ['D', 'Gradient'], ['N', 'Bezier'],
  ]},
  { section: 'Actions', items: [
    ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'],
    ['Ctrl+A', 'Select All'], ['Ctrl+D', 'Deselect'],
    ['Ctrl+C', 'Copy'], ['Ctrl+X', 'Cut'], ['Ctrl+V', 'Paste'],
    ['X', 'Swap FG/BG'],
    ['Ctrl+Shift+P', 'Command Palette'],
    ['Ctrl+K', 'Shortcut Help'],
  ]},
  { section: 'Canvas', items: [
    ['Scroll', 'Zoom in/out'],
    ['Shift+Drag', 'Pan'],
    ['Middle Click', 'Pan'],
  ]},
];

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span>Keyboard Shortcuts</span>
          <button className="dialog__close" onClick={onClose}>x</button>
        </div>
        <div className="dialog__body">
          {SHORTCUTS.map((section) => (
            <div key={section.section} className="shortcut-section">
              <div className="shortcut-section__title">{section.section}</div>
              <div className="shortcut-section__grid">
                {section.items.map(([key, desc]) => (
                  <div key={key} className="shortcut-row">
                    <kbd className="shortcut-key">{key}</kbd>
                    <span className="shortcut-desc">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
