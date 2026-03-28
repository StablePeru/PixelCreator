import { useState } from 'react';
import { ExportPreview } from './ExportPreview';

interface ExportDialogProps {
  canvasName: string;
  frameCount: number;
  onClose: () => void;
}

const FORMATS = ['png', 'gif', 'apng', 'spritesheet', 'svg'] as const;

export function ExportDialog({ canvasName, frameCount, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<typeof FORMATS[number]>('png');
  const [scale, setScale] = useState(4);
  const [frame, setFrame] = useState(0);
  const [columns, setColumns] = useState(4);

  const buildUrl = () => {
    const base = `/api/export/${format}/${canvasName}`;
    const params = new URLSearchParams();
    if (format === 'png' || format === 'gif' || format === 'apng' || format === 'svg') {
      params.set('scale', String(scale));
    }
    if (format === 'png' || format === 'svg') {
      params.set('frame', String(frame));
    }
    if (format === 'spritesheet') {
      params.set('columns', String(columns));
    }
    return `${base}?${params}`;
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = buildUrl();
    a.download = `${canvasName}.${format === 'spritesheet' ? 'png' : format}`;
    a.click();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span>Export: {canvasName}</span>
          <button className="dialog__close" onClick={onClose}>x</button>
        </div>

        <div className="dialog__body dialog__body--split">
          <div className="dialog__controls">
            <label className="dialog__field">
              <span>Format</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
                {FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </label>

            {format !== 'spritesheet' && (
              <label className="dialog__field">
                <span>Scale</span>
                <select value={scale} onChange={(e) => setScale(+e.target.value)}>
                  {[1, 2, 4, 8, 16].map((s) => <option key={s} value={s}>{s}x</option>)}
                </select>
              </label>
            )}

            {(format === 'png' || format === 'svg') && frameCount > 1 && (
              <label className="dialog__field">
                <span>Frame</span>
                <select value={frame} onChange={(e) => setFrame(+e.target.value)}>
                  {Array.from({ length: frameCount }, (_, i) => (
                    <option key={i} value={i}>Frame {i + 1}</option>
                  ))}
                </select>
              </label>
            )}

            {format === 'spritesheet' && (
              <label className="dialog__field">
                <span>Columns</span>
                <input type="number" min={1} max={32} value={columns} onChange={(e) => setColumns(+e.target.value)} />
              </label>
            )}
          </div>

          <ExportPreview
            canvasName={canvasName}
            format={format}
            scale={scale}
            frame={frame}
            columns={columns}
          />
        </div>

        <div className="dialog__footer">
          <button className="dialog__btn dialog__btn--primary" onClick={handleDownload}>Download</button>
          <button className="dialog__btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
