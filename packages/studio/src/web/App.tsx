import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useProject } from './hooks/useProject';
import { useCanvasLive } from './hooks/useCanvasLive';
import { useHistory } from './hooks/useHistory';
import { ColorProvider, useColor } from './context/ColorContext';
import { ToolProvider, useTool } from './context/ToolContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CanvasView } from './components/CanvasView';
import { PalettePanel } from './components/PalettePanel';
import { LayerPanel } from './components/LayerPanel';
import { Timeline } from './components/Timeline';
import { TransformPanel } from './components/TransformPanel';
import { ToolBar } from './components/ToolBar';
import { ExportDialog } from './components/ExportDialog';
import { ImportDialog } from './components/ImportDialog';
import { AgentPanel } from './components/AgentPanel';
import { CommandPalette } from './components/CommandPalette';
import { FeedbackPanel } from './components/FeedbackPanel';
import { DatasetBrowser } from './components/DatasetBrowser';
import { StatusBar } from './components/StatusBar';
import { ShortcutHelp } from './components/ShortcutHelp';
import { ThemeProvider } from './theme/ThemeProvider';
import type { ToolName } from './tools/types';
import './styles/global.css';

function AppInner() {
  const { status: wsStatus, subscribe } = useWebSocket();
  const { project } = useProject();
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(8);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showDataset, setShowDataset] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { metadata, frameBitmap, frameIndex, setFrameIndex } = useCanvasLive(selectedCanvas, subscribe);
  const { canUndo, canRedo, undo, redo } = useHistory(subscribe);
  const { setActiveTool } = useTool();
  const { swap } = useColor();

  // Auto-select first layer when canvas changes
  useEffect(() => {
    if (metadata?.layers?.length) {
      setActiveLayerId(metadata.layers[0].id);
    } else {
      setActiveLayerId(null);
    }
  }, [metadata?.name]);

  const handleSelect = useCallback((name: string) => {
    setSelectedCanvas(name);
    setCursorPos(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setShowShortcuts((v) => !v); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault(); setShowCommandPalette((v) => !v); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) { e.preventDefault(); redo(); return; }

      // Clipboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (selectedCanvas) fetch('/api/select/all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: selectedCanvas }) });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedCanvas) fetch('/api/select/none', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: selectedCanvas }) });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        if (selectedCanvas) fetch('/api/clipboard/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: selectedCanvas }) });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (selectedCanvas) fetch('/api/clipboard/cut', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: selectedCanvas }) });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (selectedCanvas) fetch('/api/clipboard/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: selectedCanvas }) });
        return;
      }
      if (e.key === 'Delete' && selectedCanvas) {
        // Clear selection (draw transparent)
        return;
      }

      const shortcuts: Record<string, ToolName> = {
        b: 'pencil', l: 'line', r: 'rect', c: 'circle', g: 'fill', e: 'eraser',
        m: 'marquee', w: 'wand', v: 'move',
        p: 'polygon', d: 'gradient', n: 'bezier',
      };
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) { setActiveTool(tool); return; }
      if (e.key.toLowerCase() === 'x') swap();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTool, swap, undo, redo]);

  return (
    <ToolProvider canvasName={selectedCanvas} activeLayerId={activeLayerId}>
      <div className="app">
        <TopBar
          projectName={project?.name ?? null}
          wsStatus={wsStatus}
          zoom={zoom}
          cursorPos={cursorPos}
          canvasSize={metadata ? { w: metadata.width, h: metadata.height } : null}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onExport={() => setShowExport(true)}
          onImport={() => setShowImport(true)}
          onDataset={() => setShowDataset(true)}
          hasCanvas={!!selectedCanvas}
        />
        <ToolBar />
        <div className="main">
          <div className="left-panel">
            <Sidebar
              canvases={project?.canvases ?? []}
              selected={selectedCanvas}
              onSelect={handleSelect}
            />
            <PalettePanel palettes={project?.palettes ?? []} />
            <LayerPanel
              canvasName={selectedCanvas}
              layers={(metadata?.layers ?? []) as any}
              activeLayerId={activeLayerId}
              frameIndex={frameIndex}
              onSelectLayer={setActiveLayerId}
            />
            <TransformPanel canvasName={selectedCanvas} />
          </div>
          <div className="center-panel">
            <CanvasView
              bitmap={frameBitmap}
              canvasWidth={metadata?.width ?? 0}
              canvasHeight={metadata?.height ?? 0}
              onZoomChange={setZoom}
              onCursorChange={setCursorPos}
            />
            <Timeline
              canvasName={selectedCanvas}
              frames={(metadata?.frames ?? []) as any}
              tags={(metadata?.animationTags ?? []) as any}
              currentFrame={frameIndex}
              onFrameSelect={setFrameIndex}
              onAddFrame={async () => {
                if (!selectedCanvas) return;
                await fetch(`/api/canvas/${selectedCanvas}/frame`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ copyFrom: frameIndex }),
                });
              }}
            />
          </div>
        </div>
      </div>
      {showExport && selectedCanvas && metadata && (
        <ExportDialog
          canvasName={selectedCanvas}
          frameCount={metadata.frames.length}
          onClose={() => setShowExport(false)}
        />
      )}
      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => { /* project refresh happens via WS */ }}
        />
      )}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        canvasName={selectedCanvas}
      />
      <AgentPanel subscribe={subscribe} />
      <FeedbackPanel canvasName={selectedCanvas} frameIndex={metadata?.frames?.[0]?.index ?? 0} />
      <DatasetBrowser open={showDataset} onClose={() => setShowDataset(false)} />
      <ShortcutHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <StatusBar
        canvasName={selectedCanvas}
        canvasSize={metadata ? { w: metadata.width, h: metadata.height } : null}
        activeLayerName={metadata?.layers?.find((l: any) => l.id === activeLayerId)?.name ?? null}
        frameIndex={metadata?.frames?.[0]?.index ?? 0}
        frameCount={metadata?.frames?.length ?? 0}
        cursorPos={cursorPos}
        zoom={zoom}
      />
    </ToolProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ColorProvider>
        <AppInner />
      </ColorProvider>
    </ThemeProvider>
  );
}
