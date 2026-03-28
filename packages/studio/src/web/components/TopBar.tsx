import { ConnectionStatus } from './ConnectionStatus';
import {
  UndoIcon,
  RedoIcon,
  ExportIcon,
  ImportIcon,
  DatasetIcon,
  PlusIcon,
  SettingsIcon,
} from './Icons';
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
  onNewCanvas?: () => void;
  onPreferences?: () => void;
}

export function TopBar({
  projectName,
  wsStatus,
  zoom,
  cursorPos,
  canvasSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onImport,
  onDataset,
  hasCanvas,
  onNewCanvas,
  onPreferences,
}: TopBarProps) {
  return (
    <div className="topbar">
      <span className="topbar__title">PixelCreator Studio</span>
      {projectName && <span className="topbar__info">{projectName}</span>}

      <div className="topbar__divider" />

      <div className="topbar__group">
        <button className="topbar__btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <UndoIcon size={15} />
        </button>
        <button
          className="topbar__btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <RedoIcon size={15} />
        </button>
      </div>

      <div className="topbar__divider" />

      <div className="topbar__group">
        <button className="topbar__btn" onClick={onExport} disabled={!hasCanvas} title="Export">
          <ExportIcon size={14} />
          <span>Export</span>
        </button>
        <button className="topbar__btn" onClick={onImport} title="Import">
          <ImportIcon size={14} />
          <span>Import</span>
        </button>
        <button className="topbar__btn" onClick={onDataset} title="Dataset Browser">
          <DatasetIcon size={14} />
          <span>Dataset</span>
        </button>
        {onNewCanvas && (
          <button className="topbar__btn" onClick={onNewCanvas} title="New Canvas">
            <PlusIcon size={14} />
            <span>Canvas</span>
          </button>
        )}
      </div>

      <div className="topbar__spacer" />

      {canvasSize && (
        <span className="topbar__info">
          {canvasSize.w}x{canvasSize.h}
        </span>
      )}
      {cursorPos && (
        <span className="topbar__info">
          ({cursorPos.x}, {cursorPos.y})
        </span>
      )}
      <span className="topbar__info">{zoom}x</span>
      <ConnectionStatus status={wsStatus} />

      {onPreferences && (
        <>
          <div className="topbar__divider" />
          <button className="topbar__btn" onClick={onPreferences} title="Preferences (Ctrl+,)">
            <SettingsIcon size={15} />
          </button>
        </>
      )}
    </div>
  );
}
