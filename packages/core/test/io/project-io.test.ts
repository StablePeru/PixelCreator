import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initProjectStructure,
  readProjectJSON,
  writeProjectJSON,
  readCanvasJSON,
  writeCanvasJSON,
  readPaletteJSON,
  writePaletteJSON,
  ensureCanvasStructure,
  readLayerFrame,
  writeLayerFrame,
} from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { PaletteData } from '../../src/types/palette.js';

describe('project-io', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    fs.mkdirSync(projectPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('initProjectStructure', () => {
    it('creates all required directories', () => {
      initProjectStructure(projectPath, 'test-project');

      expect(fs.existsSync(path.join(projectPath, 'project.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'palettes'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'canvases'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tilesets'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'templates'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'recipes'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'exports'))).toBe(true);
    });

    it('creates valid project.json', () => {
      initProjectStructure(projectPath, 'test-project');
      const project = readProjectJSON(projectPath);

      expect(project.name).toBe('test-project');
      expect(project.version).toBe('1.0.0');
      expect(project.canvases).toEqual([]);
      expect(project.palettes).toEqual([]);
    });
  });

  describe('canvas I/O', () => {
    const canvas: CanvasData = {
      name: 'test-canvas',
      width: 32,
      height: 32,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      palette: null,
      layers: [
        { id: 'layer-001', name: 'background', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
      ],
      frames: [
        { id: 'frame-001', index: 0, duration: 100 },
      ],
      animationTags: [],
    };

    it('writes and reads canvas JSON', () => {
      writeCanvasJSON(projectPath, 'test-canvas', canvas);
      const read = readCanvasJSON(projectPath, 'test-canvas');
      expect(read.name).toBe('test-canvas');
      expect(read.width).toBe(32);
      expect(read.layers).toHaveLength(1);
    });

    it('ensures canvas structure creates PNG files', () => {
      writeCanvasJSON(projectPath, 'test-canvas', canvas);
      ensureCanvasStructure(projectPath, 'test-canvas', canvas);

      const pngPath = path.join(projectPath, 'canvases', 'test-canvas', 'layers', 'layer-001', 'frame-001.png');
      expect(fs.existsSync(pngPath)).toBe(true);
    });
  });

  describe('palette I/O', () => {
    const palette: PaletteData = {
      name: 'test-palette',
      description: 'Test',
      colors: [
        { index: 0, hex: '#ff0000', name: 'red', group: null },
      ],
      constraints: { maxColors: 32, locked: false, allowAlpha: true },
      ramps: [],
    };

    it('writes and reads palette JSON', () => {
      initProjectStructure(projectPath, 'test');
      writePaletteJSON(projectPath, palette);
      const read = readPaletteJSON(projectPath, 'test-palette');
      expect(read.name).toBe('test-palette');
      expect(read.colors).toHaveLength(1);
    });
  });

  describe('layer frame I/O', () => {
    it('writes and reads layer frames', () => {
      const canvas: CanvasData = {
        name: 'test',
        width: 8,
        height: 8,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        palette: null,
        layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
        frames: [{ id: 'frame-001', index: 0, duration: 100 }],
        animationTags: [],
      };
      writeCanvasJSON(projectPath, 'test', canvas);

      const buf = new PixelBuffer(8, 8);
      buf.setPixel(3, 3, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'test', 'layer-001', 'frame-001', buf);

      const loaded = readLayerFrame(projectPath, 'test', 'layer-001', 'frame-001');
      expect(loaded.getPixel(3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });
  });
});
