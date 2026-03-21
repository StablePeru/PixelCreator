import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Interop Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-interop-'));
    pxc('project:init --name test', tmpDir);
    pxc('palette:create --name testpal --colors "#ff0000,#00ff00,#0000ff"', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name canvas', tmpDir);
    pxc('draw:rect --canvas canvas --x 1 --y 1 --width 6 --height 6 --color "#ff0000" --fill', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('palette:export / palette:import', () => {
    it('exports GPL format', () => {
      const dest = path.join(tmpDir, 'test.gpl');
      const result = pxcJSON(`palette:export --palette testpal --format gpl --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      const content = fs.readFileSync(dest, 'utf-8');
      expect(content).toContain('GIMP Palette');
      expect(content).toContain('255   0   0');
    });

    it('exports JASC format', () => {
      const dest = path.join(tmpDir, 'test.pal');
      const result = pxcJSON(`palette:export --palette testpal --format jasc --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      const content = fs.readFileSync(dest, 'utf-8');
      expect(content).toContain('JASC-PAL');
      expect(content).toContain('3');
    });

    it('exports HEX format', () => {
      const dest = path.join(tmpDir, 'test.hex');
      const result = pxcJSON(`palette:export --palette testpal --format hex --dest "${dest}"`, tmpDir);
      expect(result.success).toBe(true);
      const content = fs.readFileSync(dest, 'utf-8');
      expect(content).toContain('ff0000');
      expect(content).toContain('00ff00');
    });

    it('roundtrips GPL: export then import', () => {
      const dest = path.join(tmpDir, 'roundtrip.gpl');
      pxc(`palette:export --palette testpal --format gpl --dest "${dest}"`, tmpDir);
      const result = pxcJSON(`palette:import --file "${dest}" --name imported`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(3);
    });

    it('auto-detects format on import', () => {
      const dest = path.join(tmpDir, 'auto.gpl');
      pxc(`palette:export --palette testpal --format gpl --dest "${dest}"`, tmpDir);
      const result = pxcJSON(`palette:import --file "${dest}" --name auto`, tmpDir);
      expect(result.success).toBe(true);
    });

    it('import --merge adds new colors', () => {
      const dest = path.join(tmpDir, 'merge.hex');
      fs.writeFileSync(dest, 'ffffff\n000000\n', 'utf-8');
      pxcJSON(`palette:import --file "${dest}" --name testpal --merge`, tmpDir);
      const info = pxcJSON('palette:info --name testpal', tmpDir);
      expect(info.result.colorCount).toBe(5); // 3 original + 2 new
    });

    it('import errors on duplicate without --merge', () => {
      const dest = path.join(tmpDir, 'dup.hex');
      fs.writeFileSync(dest, 'ffffff\n', 'utf-8');
      try {
        pxcJSON(`palette:import --file "${dest}" --name testpal`, tmpDir);
        expect.fail('Should have thrown');
      } catch {
        // Expected
      }
    });
  });

  describe('export:svg', () => {
    it('exports valid SVG file', () => {
      const dest = path.join(tmpDir, 'test.svg');
      const result = pxcJSON(`export:svg --canvas canvas --dest "${dest}" --scale 10`, tmpDir);
      expect(result.success).toBe(true);
      const svg = fs.readFileSync(dest, 'utf-8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('fill="#ff0000"');
    });

    it('--grid adds grid lines', () => {
      const dest = path.join(tmpDir, 'grid.svg');
      pxc(`export:svg --canvas canvas --dest "${dest}" --grid`, tmpDir);
      const svg = fs.readFileSync(dest, 'utf-8');
      expect(svg).toContain('<line');
    });
  });

  describe('export:9slice', () => {
    it('creates 9 PNG files + metadata', () => {
      const dest = path.join(tmpDir, 'slices');
      const result = pxcJSON(`export:9slice --canvas canvas --dest "${dest}" --top 2 --bottom 2 --left 2 --right 2`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(dest, 'canvas_center.png'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'canvas_top-left.png'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'canvas_9slice.json'))).toBe(true);
    });

    it('metadata contains correct borders', () => {
      const dest = path.join(tmpDir, 'slices2');
      pxc(`export:9slice --canvas canvas --dest "${dest}" --top 2 --bottom 2 --left 2 --right 2`, tmpDir);
      const meta = JSON.parse(fs.readFileSync(path.join(dest, 'canvas_9slice.json'), 'utf-8'));
      expect(meta.borders.top).toBe(2);
      expect(meta.borders.bottom).toBe(2);
      expect(meta.regions.length).toBe(9);
    });
  });

  describe('import:palette-image', () => {
    it('extracts unique colors from PNG', () => {
      // Export palette as image first, then import it
      const imgDest = path.join(tmpDir, 'swatch.png');
      pxc(`export:palette-image --palette testpal --dest "${imgDest}" --columns 3 --cell-size 4`, tmpDir);
      const result = pxcJSON(`import:palette-image --file "${imgDest}" --name fromimg`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.colorCount).toBe(3);
    });
  });

  describe('export:palette-image', () => {
    it('creates PNG swatch image', () => {
      const dest = path.join(tmpDir, 'pal.png');
      const result = pxcJSON(`export:palette-image --palette testpal --dest "${dest}" --columns 3 --cell-size 8`, tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(dest)).toBe(true);
      expect(result.result.width).toBe(24); // 3 cols * 8px
      expect(result.result.height).toBe(8); // 1 row * 8px
    });
  });

  describe('export:css', () => {
    it('generates CSS box-shadow', () => {
      const dest = path.join(tmpDir, 'art.css');
      const result = pxcJSON(`export:css --canvas canvas --dest "${dest}" --scale 2`, tmpDir);
      expect(result.success).toBe(true);
      const css = fs.readFileSync(dest, 'utf-8');
      expect(css).toContain('.pixel-art');
      expect(css).toContain('box-shadow');
      expect(css).toContain('#ff0000');
    });

    it('custom selector', () => {
      const dest = path.join(tmpDir, 'custom.css');
      pxc(`export:css --canvas canvas --dest "${dest}" --selector ".my-sprite"`, tmpDir);
      const css = fs.readFileSync(dest, 'utf-8');
      expect(css).toContain('.my-sprite');
    });
  });
});
