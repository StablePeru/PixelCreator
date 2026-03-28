export type VisionDeficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
  passAALarge: boolean;
  passAAALarge: boolean;
}

export interface PaletteAccessibilityIssue {
  colorA: { index: number; hex: string };
  colorB: { index: number; hex: string };
  deficiency: VisionDeficiency;
  simulatedDistance: number;
  severity: 'indistinguishable' | 'difficult' | 'marginal';
}

export interface PaletteAccessibilityReport {
  paletteName: string;
  totalColors: number;
  issues: PaletteAccessibilityIssue[];
  issuesByDeficiency: Record<VisionDeficiency, number>;
  score: number;
}
