import { useState, useEffect, useCallback, useRef } from 'react';

interface CommandInfo {
  method: string;
  path: string;
  description: string;
  fields: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  canvasName: string | null;
}

export function CommandPalette({ open, onClose, canvasName }: CommandPaletteProps) {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CommandInfo | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/agent/commands')
      .then((r) => r.json())
      .then(setCommands)
      .catch(() => {});
    setQuery('');
    setSelected(null);
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const filtered = commands.filter((c) =>
    c.path.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = useCallback((cmd: CommandInfo) => {
    setSelected(cmd);
    const defaults: Record<string, string> = {};
    for (const f of cmd.fields) {
      if (f === 'canvas') defaults[f] = canvasName || '';
      else defaults[f] = '';
    }
    setFieldValues(defaults);
    setResult(null);
  }, [canvasName]);

  const handleExecute = async () => {
    if (!selected) return;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fieldValues)) {
      if (v === '') continue;
      const num = Number(v);
      body[k] = isNaN(num) || v.startsWith('#') ? (v === 'true' ? true : v === 'false' ? false : v) : num;
    }
    try {
      const res = await fetch(selected.path, {
        method: selected.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(String(err));
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette__input"
          placeholder="Search commands..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        />

        {!selected ? (
          <div className="command-palette__list">
            {filtered.slice(0, 15).map((cmd) => (
              <div
                key={cmd.path}
                className="command-palette__item"
                onClick={() => handleSelect(cmd)}
              >
                <span className="command-palette__method">{cmd.method}</span>
                <span className="command-palette__path">{cmd.path}</span>
                <span className="command-palette__desc">{cmd.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="command-palette__form">
            <div className="command-palette__form-header">{selected.description}</div>
            {selected.fields.map((field) => (
              <label key={field} className="dialog__field">
                <span>{field}</span>
                <input
                  type="text"
                  value={fieldValues[field] || ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder={field}
                />
              </label>
            ))}
            <button className="dialog__btn dialog__btn--primary" onClick={handleExecute}>Execute</button>
            {result && <pre className="command-palette__result">{result}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
