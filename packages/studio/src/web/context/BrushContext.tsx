import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'both' | 'radial';

export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  shape: string;
  spacing: number;
  opacity: number;
  pixelPerfect: boolean;
}

export interface SymmetryConfig {
  mode: SymmetryMode;
  axisX?: number;
  axisY?: number;
  radialSegments?: number;
  radialCenterX?: number;
  radialCenterY?: number;
}

interface BrushState {
  presets: BrushPreset[];
  activeBrush: BrushPreset;
  symmetry: SymmetryConfig;
  setActiveBrush: (preset: BrushPreset) => void;
  setSymmetry: (config: SymmetryConfig) => void;
  cycleSymmetry: () => void;
  adjustBrushSize: (delta: number) => void;
  refreshPresets: () => void;
}

const defaultBrush: BrushPreset = {
  id: 'brush-001', name: 'Pixel', size: 1, shape: 'square', spacing: 1, opacity: 255, pixelPerfect: true,
};

const defaultSymmetry: SymmetryConfig = { mode: 'none' };

const SYMMETRY_CYCLE: SymmetryMode[] = ['none', 'horizontal', 'vertical', 'both', 'radial'];

const BrushCtx = createContext<BrushState | null>(null);

export function BrushProvider({ children, canvasName }: { children: ReactNode; canvasName: string | null }) {
  const [presets, setPresets] = useState<BrushPreset[]>([]);
  const [activeBrush, setActiveBrush] = useState<BrushPreset>(defaultBrush);
  const [symmetry, setSymmetryState] = useState<SymmetryConfig>(defaultSymmetry);

  const refreshPresets = useCallback(() => {
    fetch('/api/brush/presets')
      .then(r => r.json())
      .then(data => {
        if (data.presets) setPresets(data.presets);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshPresets(); }, []);

  // Load symmetry config when canvas changes
  useEffect(() => {
    if (!canvasName) return;
    fetch(`/api/canvas/${canvasName}/symmetry`)
      .then(r => r.json())
      .then(data => {
        if (data.symmetry) setSymmetryState(data.symmetry);
      })
      .catch(() => {});
  }, [canvasName]);

  const setSymmetry = useCallback((config: SymmetryConfig) => {
    setSymmetryState(config);
    if (canvasName) {
      fetch(`/api/canvas/${canvasName}/symmetry`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {});
    }
  }, [canvasName]);

  const cycleSymmetry = useCallback(() => {
    setSymmetryState(prev => {
      const idx = SYMMETRY_CYCLE.indexOf(prev.mode);
      const next = SYMMETRY_CYCLE[(idx + 1) % SYMMETRY_CYCLE.length];
      const config: SymmetryConfig = { ...prev, mode: next };
      if (canvasName) {
        fetch(`/api/canvas/${canvasName}/symmetry`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }).catch(() => {});
      }
      return config;
    });
  }, [canvasName]);

  const adjustBrushSize = useCallback((delta: number) => {
    setActiveBrush(prev => ({
      ...prev,
      size: Math.max(1, Math.min(64, prev.size + delta)),
    }));
  }, []);

  return (
    <BrushCtx.Provider value={{ presets, activeBrush, symmetry, setActiveBrush, setSymmetry, cycleSymmetry, adjustBrushSize, refreshPresets }}>
      {children}
    </BrushCtx.Provider>
  );
}

export function useBrush() {
  const ctx = useContext(BrushCtx);
  if (!ctx) throw new Error('useBrush must be used within BrushProvider');
  return ctx;
}
