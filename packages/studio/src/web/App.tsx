import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useProject } from './hooks/useProject';
import { useCanvasLive } from './hooks/useCanvasLive';
import { useHistory } from './hooks/useHistory';
import { ColorProvider, useColor } from './context/ColorContext';
import { ToolProvider, useTool } from './context/ToolContext';
import { BrushProvider, useBrush } from './context/BrushContext';
import { ToastProvider } from './hooks/useToast';
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
import { BrushPanel } from './components/BrushPanel';
import { SymmetryPanel } from './components/SymmetryPanel';
import { ToastContainer } from './components/ToastContainer';
import { PreferencesDialog } from './components/PreferencesDialog';
import { ProjectInitDialog } from './components/ProjectInitDialog';
import { CanvasCreateDialog } from './components/CanvasCreateDialog';
import { ReferencePanel } from './components/ReferencePanel';
import { Minimap } from './components/Minimap';
import { EffectsPanel } from './components/EffectsPanel';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { ProceduralPanel } from './components/ProceduralPanel';
import { GamedevExportPanel } from './components/GamedevExportPanel';
import { StateMachinePanel } from './components/StateMachinePanel';
import { AgentModePanel } from './components/AgentModePanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { useAgentSession } from './hooks/useAgentSession';
import { ThemeProvider } from './theme/ThemeProvider';
import type { ToolName } from './tools/types';
import './styles/global.css';

// Inner component that uses Brush/Tool contexts (must be inside providers)
function AppShortcuts({
  selectedCanvas,
  undo,
  redo,
}: {
  selectedCanvas: string | null;
  undo: () => void;
  redo: () => void;
}) {
  const { setActiveTool } = useTool();
  const { swap } = useColor();
  const { cycleSymmetry, adjustBrushSize } = useBrush();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (selectedCanvas)
          fetch('/api/select/all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvas: selectedCanvas }),
          });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedCanvas)
          fetch('/api/select/none', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvas: selectedCanvas }),
          });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        if (selectedCanvas)
          fetch('/api/clipboard/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvas: selectedCanvas }),
          });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (selectedCanvas)
          fetch('/api/clipboard/cut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvas: selectedCanvas }),
          });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (selectedCanvas)
          fetch('/api/clipboard/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvas: selectedCanvas }),
          });
        return;
      }

      const shortcuts: Record<string, ToolName> = {
        b: 'pencil',
        i: 'line',
        r: 'rect',
        c: 'circle',
        g: 'fill',
        e: 'eraser',
        m: 'marquee',
        w: 'wand',
        l: 'lasso',
        y: 'polyselect',
        v: 'move',
        p: 'polygon',
        d: 'gradient',
        n: 'bezier',
      };
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) {
        setActiveTool(tool);
        return;
      }
      if (e.key.toLowerCase() === 'x') swap();
      if (e.key.toLowerCase() === 's') {
        cycleSymmetry();
        return;
      }
      if (e.key === '[') {
        adjustBrushSize(-1);
        return;
      }
      if (e.key === ']') {
        adjustBrushSize(1);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTool, swap, undo, redo, cycleSymmetry, adjustBrushSize, selectedCanvas]);

  return null;
}

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
  const [showPreferences, setShowPreferences] = useState(false);
  const [showCanvasCreate, setShowCanvasCreate] = useState(false);
  const [showProjectInit, setShowProjectInit] = useState(false);
  const [simulationDeficiency, setSimulationDeficiency] = useState<
    'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | null
  >(null);
  const [showAgentMode, setShowAgentMode] = useState(false);

  const { metadata, frameBitmap, frameIndex, setFrameIndex } = useCanvasLive(
    selectedCanvas,
    subscribe,
  );
  const { canUndo, canRedo, undo, redo } = useHistory(subscribe);
  const agentSession = useAgentSession(subscribe);

  const referenceLayer =
    (metadata?.layers as any[])?.find((l: any) => l.type === 'reference') ?? null;

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

  // Keyboard shortcuts for dialogs (no context needed)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowPreferences((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowAgentMode((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <BrushProvider canvasName={selectedCanvas}>
      <ToolProvider canvasName={selectedCanvas} activeLayerId={activeLayerId}>
        <AppShortcuts selectedCanvas={selectedCanvas} undo={undo} redo={redo} />
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
            onNewCanvas={() => setShowCanvasCreate(true)}
            onPreferences={() => setShowPreferences(true)}
          />
          <ToolBar />
          <div className="main">
            <div className="left-panel">
              <Sidebar
                canvases={project?.canvases ?? []}
                selected={selectedCanvas}
                onSelect={handleSelect}
                onNewCanvas={() => setShowCanvasCreate(true)}
              />
              <div className="left-panel__scrollable">
                <CollapsiblePanel title="Palette" count={(project?.palettes ?? []).length}>
                  <PalettePanel palettes={project?.palettes ?? []} canvasName={selectedCanvas} />
                </CollapsiblePanel>
                <CollapsiblePanel title="Layers" count={(metadata?.layers ?? []).length}>
                  <LayerPanel
                    canvasName={selectedCanvas}
                    layers={(metadata?.layers ?? []) as any}
                    activeLayerId={activeLayerId}
                    frameIndex={frameIndex}
                    onSelectLayer={setActiveLayerId}
                  />
                </CollapsiblePanel>
                <CollapsiblePanel title="Transform">
                  <TransformPanel canvasName={selectedCanvas} />
                </CollapsiblePanel>
                <CollapsiblePanel title="Brushes">
                  <BrushPanel />
                </CollapsiblePanel>
                <CollapsiblePanel title="Symmetry">
                  <SymmetryPanel />
                </CollapsiblePanel>
                <CollapsiblePanel title="Effects">
                  <EffectsPanel canvasName={selectedCanvas} layerId={activeLayerId} />
                </CollapsiblePanel>
                <CollapsiblePanel title="Accessibility" defaultOpen={false}>
                  <AccessibilityPanel
                    canvasName={selectedCanvas}
                    paletteName={metadata?.palette ?? null}
                    onSimulationChange={setSimulationDeficiency}
                    activeSimulation={simulationDeficiency}
                  />
                </CollapsiblePanel>
                <CollapsiblePanel title="Procedural" defaultOpen={false}>
                  <ProceduralPanel canvasName={selectedCanvas} />
                </CollapsiblePanel>
                <CollapsiblePanel title="Game Export" defaultOpen={false}>
                  <GamedevExportPanel canvasName={selectedCanvas} />
                </CollapsiblePanel>
                <CollapsiblePanel title="State Machine" defaultOpen={false}>
                  <StateMachinePanel
                    canvasName={selectedCanvas}
                    tags={metadata?.animationTags ?? []}
                  />
                </CollapsiblePanel>
                <CollapsiblePanel title="Reference" defaultOpen={false}>
                  <ReferencePanel
                    canvasName={selectedCanvas}
                    referenceLayer={referenceLayer}
                    onUpdate={() => {}}
                  />
                </CollapsiblePanel>
              </div>
            </div>
            <div className="center-panel">
              <CanvasView
                bitmap={frameBitmap}
                canvasWidth={metadata?.width ?? 0}
                canvasHeight={metadata?.height ?? 0}
                onZoomChange={setZoom}
                onCursorChange={setCursorPos}
                agentModeActive={agentSession.isActive}
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
        {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={() => {}} />}
        <CommandPalette
          open={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          canvasName={selectedCanvas}
        />
        <AgentPanel subscribe={subscribe} />
        <FeedbackPanel canvasName={selectedCanvas} frameIndex={metadata?.frames?.[0]?.index ?? 0} />
        <DatasetBrowser open={showDataset} onClose={() => setShowDataset(false)} />
        <ShortcutHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <PreferencesDialog open={showPreferences} onClose={() => setShowPreferences(false)} />
        <CanvasCreateDialog
          open={showCanvasCreate}
          onClose={() => setShowCanvasCreate(false)}
          onCreated={(name) => setSelectedCanvas(name)}
        />
        <ProjectInitDialog
          open={showProjectInit}
          onClose={() => setShowProjectInit(false)}
          onCreated={() => {}}
        />
        <AgentModePanel
          session={agentSession.session}
          isActive={agentSession.isActive}
          isPaused={agentSession.isPaused}
          pendingOperation={agentSession.pendingOperation}
          canvasName={selectedCanvas}
          onStart={agentSession.start}
          onPause={agentSession.pause}
          onResume={agentSession.resume}
          onEnd={agentSession.end}
          onApprove={agentSession.approve}
          onReject={agentSession.reject}
          onSendFeedback={agentSession.sendFeedback}
          onClose={() => setShowAgentMode(false)}
          visible={showAgentMode}
        />
        <ToastContainer />
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
    </BrushProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ColorProvider>
          <AppInner />
        </ColorProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
