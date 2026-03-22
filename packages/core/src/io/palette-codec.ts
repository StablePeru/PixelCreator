export interface PaletteColorRgb {
  r: number;
  g: number;
  b: number;
  name: string | null;
}

export type PaletteFormat = 'gpl' | 'jasc' | 'hex';

// --- GPL (GIMP Palette) ---

export function parseGpl(content: string): { name: string; colors: PaletteColorRgb[] } {
  const lines = content.split(/\r?\n/);
  if (!lines[0] || lines[0].trim() !== 'GIMP Palette') {
    throw new Error('Invalid GPL file: missing "GIMP Palette" header');
  }

  let name = 'Untitled';
  const colors: PaletteColorRgb[] = [];
  let headerDone = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (!headerDone) {
      if (line.startsWith('Name:')) {
        name = line.slice(5).trim();
        continue;
      }
      if (line.startsWith('Columns:') || line.startsWith('#')) {
        continue;
      }
      headerDone = true;
    }

    if (line.startsWith('#')) continue;

    // Parse color line: "R G B\tName" or "R G B"
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;

    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    if (isNaN(r) || isNaN(g) || isNaN(b)) continue;

    // Name is everything after the 3 numbers (tab or space separated)
    const nameMatch = line.match(/^\s*\d+\s+\d+\s+\d+\s+(.*)/);
    const colorName = nameMatch && nameMatch[1].trim() ? nameMatch[1].trim() : null;

    colors.push({ r, g, b, name: colorName });
  }

  return { name, colors };
}

export function serializeGpl(name: string, colors: PaletteColorRgb[]): string {
  const lines: string[] = ['GIMP Palette', `Name: ${name}`, `Columns: 8`, '#'];
  for (const c of colors) {
    const r = String(c.r).padStart(3, ' ');
    const g = String(c.g).padStart(3, ' ');
    const b = String(c.b).padStart(3, ' ');
    const n = c.name || 'Untitled';
    lines.push(`${r} ${g} ${b}\t${n}`);
  }
  return lines.join('\n') + '\n';
}

// --- JASC-PAL ---

export function parseJasc(content: string): { colors: PaletteColorRgb[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines[0]?.trim() !== 'JASC-PAL') {
    throw new Error('Invalid JASC-PAL file: missing header');
  }
  // lines[1] = version "0100", lines[2] = color count
  const colors: PaletteColorRgb[] = [];
  for (let i = 3; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 3) continue;
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    if (isNaN(r) || isNaN(g) || isNaN(b)) continue;
    colors.push({ r, g, b, name: null });
  }
  return { colors };
}

export function serializeJasc(colors: PaletteColorRgb[]): string {
  const lines = ['JASC-PAL', '0100', String(colors.length)];
  for (const c of colors) {
    lines.push(`${c.r} ${c.g} ${c.b}`);
  }
  return lines.join('\n') + '\n';
}

// --- HEX (Lospec format) ---

export function parseHex(content: string): { colors: PaletteColorRgb[] } {
  const lines = content.split(/\r?\n/);
  const colors: PaletteColorRgb[] = [];
  for (const line of lines) {
    const hex = line.trim().replace(/^#/, '');
    if (hex.length !== 6) continue;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) continue;
    colors.push({ r, g, b, name: null });
  }
  return { colors };
}

export function serializeHex(colors: PaletteColorRgb[]): string {
  return colors
    .map((c) => {
      const r = c.r.toString(16).padStart(2, '0');
      const g = c.g.toString(16).padStart(2, '0');
      const b = c.b.toString(16).padStart(2, '0');
      return `${r}${g}${b}`;
    })
    .join('\n') + '\n';
}

// --- Format detection ---

export function detectPaletteFormat(content: string): PaletteFormat | null {
  const firstLine = content.split(/\r?\n/)[0]?.trim();
  if (firstLine === 'GIMP Palette') return 'gpl';
  if (firstLine === 'JASC-PAL') return 'jasc';

  // Check if all non-empty lines are 6-char hex
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > 0 && lines.every((l) => /^#?[0-9a-fA-F]{6}$/.test(l.trim()))) {
    return 'hex';
  }

  return null;
}
