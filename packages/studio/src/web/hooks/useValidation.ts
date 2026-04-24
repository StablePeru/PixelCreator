import { useCallback, useEffect, useState } from 'react';

export type FlagSeverity = 'error' | 'warning' | 'info';
export type FlagCategory =
  | 'pixel'
  | 'color'
  | 'palette'
  | 'animation'
  | 'bounds'
  | 'composition'
  | 'other';

export interface FlagRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ValidationFlag {
  id: string;
  canvas: string;
  frameIndex?: number;
  layerId?: string;
  region?: FlagRegion;
  severity: FlagSeverity;
  category: FlagCategory;
  note: string;
  tags: string[];
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface ValidationSizeIssue {
  canvas: string;
  width: number;
  height: number;
  rule: string;
  message: string;
}

export interface ValidationPaletteIssue {
  canvas: string;
  frame: number;
  offenders: { x: number; y: number; color: string }[];
  totalPixelsOutOfPalette: number;
}

export interface PaletteAccessibilityIssueSummary {
  severity: 'indistinguishable' | 'difficult' | 'marginal';
}

export interface PaletteAccessibilitySection {
  paletteName: string;
  totalColors: number;
  score: number;
  issues: PaletteAccessibilityIssueSummary[];
}

export interface AssetValidationSection {
  asset: string;
  valid: boolean;
  issues: { severity: 'error' | 'warning'; field: string; message: string }[];
}

export type ReportInclude = 'palette' | 'accessibility' | 'asset';

export interface ValidationReport {
  canvas: string;
  generatedAt: number;
  manual: ValidationFlag[];
  automatic: {
    size?: ValidationSizeIssue[];
    palette?: ValidationPaletteIssue[];
    accessibility?: PaletteAccessibilitySection;
    asset?: AssetValidationSection[];
  };
}

export interface RunReportOptions {
  includes?: ReportInclude[];
  palette?: string;
}

type Subscribe = (event: string, cb: (data: unknown) => void) => () => void;

interface CreateFlagInput {
  severity: FlagSeverity;
  category: FlagCategory;
  note: string;
  tags?: string[];
  frameIndex?: number;
  layerId?: string;
  region?: FlagRegion;
}

export function useValidation(canvasName: string | null, subscribe: Subscribe) {
  const [flags, setFlags] = useState<ValidationFlag[]>([]);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    if (!canvasName) {
      setFlags([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/validation?canvas=${encodeURIComponent(canvasName)}`);
      if (!res.ok) throw new Error(`Failed to fetch flags (${res.status})`);
      const body = (await res.json()) as { flags: ValidationFlag[] };
      setFlags(body.flags);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [canvasName]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  useEffect(() => {
    return subscribe('validation:updated', (data) => {
      const d = data as { canvasName?: string };
      if (d.canvasName === canvasName) fetchFlags();
    });
  }, [canvasName, subscribe, fetchFlags]);

  const createFlag = useCallback(
    async (input: CreateFlagInput) => {
      if (!canvasName) return null;
      const res = await fetch('/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas: canvasName, ...input }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      await fetchFlags();
      return (await res.json()) as ValidationFlag;
    },
    [canvasName, fetchFlags],
  );

  const resolveFlagById = useCallback(
    async (id: string, resolution: string) => {
      if (!canvasName) return;
      const res = await fetch(`/api/validation/${canvasName}/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchFlags();
    },
    [canvasName, fetchFlags],
  );

  const removeFlagById = useCallback(
    async (id: string) => {
      if (!canvasName) return;
      const res = await fetch(`/api/validation/${canvasName}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchFlags();
    },
    [canvasName, fetchFlags],
  );

  const runReport = useCallback(
    async (options: RunReportOptions = {}) => {
      if (!canvasName) return null;
      const params = new URLSearchParams({ canvas: canvasName });
      if (options.includes && options.includes.length > 0) {
        params.set('include', options.includes.join(','));
      }
      if (options.palette) params.set('palette', options.palette);
      const res = await fetch(`/api/validation/report?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as ValidationReport;
      setReport(body);
      return body;
    },
    [canvasName],
  );

  return { flags, report, loading, createFlag, resolveFlagById, removeFlagById, runReport };
}
