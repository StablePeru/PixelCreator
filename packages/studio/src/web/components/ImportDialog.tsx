import { useState, useCallback, useRef } from 'react';

interface ImportDialogProps {
  onClose: () => void;
  onImported: () => void;
}

export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [name, setName] = useState('imported');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detectFormat = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'gif') return 'gif';
    if (ext === 'ase' || ext === 'aseprite') return 'ase';
    return 'png';
  };

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-'));
    setError(null);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);

    const format = detectFormat(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    try {
      const res = await fetch(`/api/import/${format}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Import failed'); return; }
      onImported();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span>Import</span>
          <button className="dialog__close" onClick={onClose}>x</button>
        </div>

        <div className="dialog__body">
          <div
            className={`import-drop ${dragOver ? 'import-drop--active' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            {file ? (
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            ) : (
              <span>Drop file here or click to browse</span>
            )}
            <input ref={inputRef} type="file" accept=".png,.gif,.ase,.aseprite" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </div>

          <div className="dialog__hint">Supported: PNG, GIF, ASE</div>

          <label className="dialog__field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          {error && <div className="dialog__error">{error}</div>}
        </div>

        <div className="dialog__footer">
          <button className="dialog__btn dialog__btn--primary" onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing...' : 'Import'}
          </button>
          <button className="dialog__btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
