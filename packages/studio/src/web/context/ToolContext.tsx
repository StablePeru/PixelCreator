import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { ToolName, DrawTool, ToolCallbacks } from '../tools/types';
import { createPencilTool } from '../tools/PencilTool';
import { createLineTool } from '../tools/LineTool';
import { createRectTool } from '../tools/RectTool';
import { createCircleTool } from '../tools/CircleTool';
import { createFillTool } from '../tools/FillTool';
import { createEraserTool } from '../tools/EraserTool';
import { createMarqueeRectTool } from '../tools/MarqueeRectTool';
import { createMagicWandTool } from '../tools/MagicWandTool';
import { createMoveTool } from '../tools/MoveTool';
import { createPolygonTool } from '../tools/PolygonTool';
import { createGradientTool } from '../tools/GradientTool';
import { createBezierTool } from '../tools/BezierTool';
import { useColor } from './ColorContext';
import { useBrush } from './BrushContext';

interface ToolState {
  activeTool: ToolName;
  fillMode: boolean;
  thickness: number;
  currentTool: DrawTool;
  setActiveTool: (tool: ToolName) => void;
  setFillMode: (fill: boolean) => void;
  setThickness: (t: number) => void;
}

const ToolCtx = createContext<ToolState | null>(null);

interface ToolProviderProps {
  children: ReactNode;
  canvasName: string | null;
  activeLayerId?: string | null;
}

export function ToolProvider({ children, canvasName, activeLayerId }: ToolProviderProps) {
  const { foreground } = useColor();
  const { activeBrush, symmetry } = useBrush();
  const [activeTool, setActiveToolState] = useState<ToolName>('pencil');
  const [fillMode, setFillMode] = useState(false);
  const [thickness, setThickness] = useState(1);

  const canvasRef = useRef(canvasName);
  canvasRef.current = canvasName;
  const layerRef = useRef(activeLayerId);
  layerRef.current = activeLayerId;
  const colorRef = useRef(foreground);
  colorRef.current = foreground;
  const fillRef = useRef(fillMode);
  fillRef.current = fillMode;
  const thicknessRef = useRef(thickness);
  thicknessRef.current = thickness;
  const brushRef = useRef(activeBrush);
  brushRef.current = activeBrush;
  const symmetryRef = useRef(symmetry);
  symmetryRef.current = symmetry;

  const callbacks: ToolCallbacks = useMemo(() => ({
    getColor: () => colorRef.current,
    getCanvasName: () => canvasRef.current,
    getFillMode: () => fillRef.current,
    getThickness: () => thicknessRef.current,
    getBrushPreset: () => brushRef.current,
    getSymmetryConfig: () => symmetryRef.current,
    sendDraw: async (endpoint, body) => {
      const layerId = layerRef.current;
      await fetch(`/api/draw/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layerId ? { ...body, layer: layerId } : body),
      });
    },
  }), []);

  const tools = useMemo(() => ({
    pencil: createPencilTool(callbacks),
    line: createLineTool(callbacks),
    rect: createRectTool(callbacks),
    circle: createCircleTool(callbacks),
    fill: createFillTool(callbacks),
    eraser: createEraserTool(callbacks),
    marquee: createMarqueeRectTool(callbacks),
    wand: createMagicWandTool(callbacks),
    move: createMoveTool(callbacks),
    polygon: createPolygonTool(callbacks),
    gradient: createGradientTool(callbacks),
    bezier: createBezierTool(callbacks),
  }), [callbacks]);

  const currentTool = tools[activeTool];

  const setActiveTool = useCallback((tool: ToolName) => {
    currentTool.reset();
    setActiveToolState(tool);
  }, [currentTool]);

  return (
    <ToolCtx.Provider value={{ activeTool, fillMode, thickness, currentTool, setActiveTool, setFillMode, setThickness }}>
      {children}
    </ToolCtx.Provider>
  );
}

export function useTool() {
  const ctx = useContext(ToolCtx);
  if (!ctx) throw new Error('useTool must be used within ToolProvider');
  return ctx;
}
