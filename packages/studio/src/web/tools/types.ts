export type ToolName = 'pencil' | 'line' | 'rect' | 'circle' | 'fill' | 'eraser' | 'marquee' | 'wand' | 'move' | 'polygon' | 'gradient' | 'bezier';

export interface PreviewShape {
  type: 'line' | 'rect' | 'circle' | 'pixels';
  color: string;
  fill?: boolean;
  // line: x1,y1,x2,y2 | rect: x,y,w,h | circle: cx,cy,r | pixels: points[]
  x1?: number; y1?: number; x2?: number; y2?: number;
  x?: number; y?: number; w?: number; h?: number;
  cx?: number; cy?: number; r?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface DrawTool {
  name: ToolName;
  label: string;
  shortcut: string;
  cursor: string;
  onStart(x: number, y: number): void;
  onMove(x: number, y: number): void;
  onEnd(): Promise<void>;
  getPreview(): PreviewShape | null;
  reset(): void;
}

export interface ToolCallbacks {
  getColor: () => string;
  getCanvasName: () => string | null;
  sendDraw: (endpoint: string, body: Record<string, unknown>) => Promise<void>;
  getFillMode: () => boolean;
  getThickness: () => number;
}
