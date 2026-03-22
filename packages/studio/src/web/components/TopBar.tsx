import { ConnectionStatus } from './ConnectionStatus';
import type { WsStatus } from '../hooks/useWebSocket';

interface TopBarProps {
  projectName: string | null;
  wsStatus: WsStatus;
  zoom: number;
  cursorPos: { x: number; y: number } | null;
  canvasSize: { w: number; h: number } | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onImport: () => void;
  onDataset: () => void;
  hasCanvas: boolean;
}

export function TopBar({ projectName, wsStatus, zoom, cursorPos, canvasSize, canUndo, canRedo, onUndo, onRedo, onExport, onImport, onDataset, hasCanvas }: TopBarProps) {
  return (
    <div className="topbar">
      <span className="topbar__title">PixelCreator Studio</span>
      {projectName && <span className="topbar__info">{projectName}</span>}

      <button
        className="topbar__btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        &#x21A9;
      </button>
      <button
        className="topbar__btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        &#x21AA;
      </button>

      <button className="topbar__btn" onClick={onExport} disabled={!hasCanvas} title="Export">Export</button>
      <button className="topbar__btn" onClick={onImport} title="Import">Import</button>
      <button className="topbar__btn" onClick={onDataset} title="Dataset Browser">Dataset</button>

      <div className="topbar__spacer" />
      {canvasSize && (
        <span className="topbar__info">{canvasSize.w}x{canvasSize.h}</span>
      )}
      {cursorPos && (
        <span className="topbar__info">({cursorPos.x}, {cursorPos.y})</span>
      )}
      <span className="topbar__info">{zoom}x</span>
      <ConnectionStatus status={wsStatus} />
    </div>
  );
}
