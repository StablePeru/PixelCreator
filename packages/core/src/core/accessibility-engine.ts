import { PixelBuffer } from '../io/png-codec.js';
import type { RGBA } from '../types/common.js';
import { hexToRGBA, rgbaToHex, colorDistance } from '../types/common.js';
import type { VisionDeficiency, ContrastResult, PaletteAccessibilityIssue, PaletteAccessibilityReport } from '../types/accessibility.js';
import type { PaletteData } from '../types/palette.js';

// --- sRGB Linearization ---

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function delinearize(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

// --- CVD Simulation Matrices (Vienot 1999 / Brettel 1997) ---

type Matrix3x3 = [number, number, number, number, number, number, number, number, number];

const MATRICES: Record<Exclude<VisionDeficiency, 'achromatopsia'>, Matrix3x3> = {
  protanopia: [
    0.56667, 0.43333, 0.00000,
    0.55833, 0.44167, 0.00000,
    0.00000, 0.24167, 0.75833,
  ],
  deuteranopia: [
    0.62500, 0.37500, 0.00000,
    0.70000, 0.30000, 0.00000,
    0.00000, 0.30000, 0.70000,
  ],
  tritanopia: [
    0.95000, 0.05000, 0.00000,
    0.00000, 0.43333, 0.56667,
    0.00000, 0.47500, 0.52500,
  ],
};

function applyMatrix(r: number, g: number, b: number, m: Matrix3x3): [number, number, number] {
  return [
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  ];
}

// --- Color Blindness Simulation ---

export function simulateColorBlindness(color: RGBA, deficiency: VisionDeficiency): RGBA {
  if (color.a === 0) return { ...color };

  const lr = linearize(color.r);
  const lg = linearize(color.g);
  const lb = linearize(color.b);

  let sr: number, sg: number, sb: number;

  if (deficiency === 'achromatopsia') {
    const lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    sr = sg = sb = lum;
  } else {
    [sr, sg, sb] = applyMatrix(lr, lg, lb, MATRICES[deficiency]);
  }

  return {
    r: delinearize(sr),
    g: delinearize(sg),
    b: delinearize(sb),
    a: color.a,
  };
}

export function simulateBufferColorBlindness(
  buffer: PixelBuffer,
  deficiency: VisionDeficiency,
): PixelBuffer {
  const result = new PixelBuffer(buffer.width, buffer.height);
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      if (pixel.a === 0) continue;
      result.setPixel(x, y, simulateColorBlindness(pixel, deficiency));
    }
  }
  return result;
}

// --- WCAG Contrast ---

export function relativeLuminance(color: RGBA): number {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkContrast(foreground: RGBA, background: RGBA): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    foreground: rgbaToHex(foreground),
    background: rgbaToHex(background),
    ratio: Math.round(ratio * 100) / 100,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7,
    passAALarge: ratio >= 3,
    passAAALarge: ratio >= 4.5,
  };
}

// --- Palette Accessibility ---

export function analyzePaletteAccessibility(
  palette: PaletteData,
  deficiencies: VisionDeficiency[] = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
): PaletteAccessibilityReport {
  const issues: PaletteAccessibilityIssue[] = [];
  const issuesByDeficiency: Record<VisionDeficiency, number> = {
    protanopia: 0, deuteranopia: 0, tritanopia: 0, achromatopsia: 0,
  };

  const colors: RGBA[] = palette.colors.map(c => {
    const rgba = hexToRGBA(c.hex);
    return { r: rgba.r, g: rgba.g, b: rgba.b, a: 255 };
  });

  let totalPairs = 0;

  for (const deficiency of deficiencies) {
    const simulated = colors.map(c => simulateColorBlindness(c, deficiency));

    for (let i = 0; i < simulated.length; i++) {
      for (let j = i + 1; j < simulated.length; j++) {
        totalPairs++;
        const dist = colorDistance(simulated[i], simulated[j]);

        let severity: 'indistinguishable' | 'difficult' | 'marginal' | null = null;
        if (dist < 10) severity = 'indistinguishable';
        else if (dist < 25) severity = 'difficult';
        else if (dist < 40) severity = 'marginal';

        if (severity) {
          issues.push({
            colorA: { index: i, hex: rgbaToHex(colors[i]) },
            colorB: { index: j, hex: rgbaToHex(colors[j]) },
            deficiency,
            simulatedDistance: Math.round(dist * 100) / 100,
            severity,
          });
          issuesByDeficiency[deficiency]++;
        }
      }
    }
  }

  const criticalIssues = issues.filter(i => i.severity === 'indistinguishable' || i.severity === 'difficult').length;
  const score = totalPairs > 0 ? Math.round(100 * (1 - criticalIssues / totalPairs)) : 100;

  return {
    paletteName: palette.name,
    totalColors: palette.colors.length,
    issues,
    issuesByDeficiency,
    score,
  };
}
