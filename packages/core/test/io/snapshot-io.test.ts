import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot } from '../../src/io/snapshot-io.js';
import { PixelBuffer, savePNG } from '../../src/io/png-codec.js';

describe('snapshot-io', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-snap-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    fs.mkdirSync(projectPath);
    // Create a canvas
    const canvasDir = path.join(projectPath, 'canvases', 'player');
    const layerDir = path.join(canvasDir, 'layers', 'layer-001');
    fs.mkdirSync(layerDir, { recursive: true });
    fs.writeFileSync(path.join(canvasDir, 'canvas.json'), JSON.stringify({ name: 'player', width: 4, height: 4 }));
    savePNG(new PixelBuffer(4, 4), path.join(layerDir, 'frame-001.png'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a snapshot', () => {
    const info = createSnapshot(projectPath, 'player', 'test snapshot');
    expect(info.id).toMatch(/^snap-/);
    expect(info.canvases).toEqual(['player']);
    expect(info.description).toBe('test snapshot');
  });

  it('lists snapshots', () => {
    createSnapshot(projectPath, 'player', 'first');
    createSnapshot(projectPath, 'player', 'second');
    const list = listSnapshots(projectPath);
    expect(list).toHaveLength(2);
  });

  it('returns empty list when no snapshots', () => {
    expect(listSnapshots(projectPath)).toHaveLength(0);
  });

  it('restores a snapshot', () => {
    const info = createSnapshot(projectPath, 'player', 'before edit');

    // Modify the canvas
    const canvasJson = path.join(projectPath, 'canvases', 'player', 'canvas.json');
    fs.writeFileSync(canvasJson, JSON.stringify({ name: 'player', width: 8, height: 8, modified: true }));

    // Restore
    restoreSnapshot(projectPath, info.id, 'player');
    const restored = JSON.parse(fs.readFileSync(canvasJson, 'utf-8'));
    expect(restored.width).toBe(4); // back to original
  });

  it('throws when restoring nonexistent snapshot', () => {
    expect(() => restoreSnapshot(projectPath, 'nonexistent', 'player')).toThrow();
  });

  it('throws when canvas not in snapshot', () => {
    const info = createSnapshot(projectPath, 'player', 'test');
    expect(() => restoreSnapshot(projectPath, info.id, 'nonexistent')).toThrow();
  });

  it('deletes a snapshot', () => {
    const info = createSnapshot(projectPath, 'player', 'to delete');
    expect(listSnapshots(projectPath)).toHaveLength(1);
    deleteSnapshot(projectPath, info.id);
    expect(listSnapshots(projectPath)).toHaveLength(0);
  });

  it('delete is safe for nonexistent snapshot', () => {
    deleteSnapshot(projectPath, 'nonexistent');
    // Should not throw
  });

  it('throws when creating snapshot for nonexistent canvas', () => {
    expect(() => createSnapshot(projectPath, 'nonexistent', 'test')).toThrow();
  });
});
