import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): Record<string, unknown> {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('E2E Pipeline', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('full create → draw → export pipeline', () => {
    // 1. Init project
    const initResult = pxcJSON('project:init --name test', tmpDir);
    expect(initResult.success).toBe(true);

    const projectPath = path.join(tmpDir, 'test.pxc');
    expect(fs.existsSync(path.join(projectPath, 'project.json'))).toBe(true);

    // 2. Create canvas
    const createResult = pxcJSON('canvas:create --width 16 --height 16 --name sprite', tmpDir);
    expect(createResult.success).toBe(true);

    // 3. Draw pixels
    pxc('draw:pixel --x 0 --y 0 --color "#ff0000" --canvas sprite', tmpDir);
    pxc('draw:line --x1 0 --y1 8 --x2 15 --y2 8 --color "#00ff00" --canvas sprite', tmpDir);
    pxc('draw:rect --x 4 --y 4 --width 8 --height 8 --color "#0000ff" --fill --canvas sprite', tmpDir);

    // 4. Export PNG
    const exportDest = path.join(tmpDir, 'output.png');
    pxc(`export:png --canvas sprite --dest "${exportDest}"`, tmpDir);
    expect(fs.existsSync(exportDest)).toBe(true);
    const stat = fs.statSync(exportDest);
    expect(stat.size).toBeGreaterThan(0);

    // 5. Verify project info
    const infoResult = pxcJSON('project:info', tmpDir) as { result: { canvasCount: number } };
    expect(infoResult.result.canvasCount).toBe(1);
  });

  it('animation workflow: frames + spritesheet', () => {
    pxc('project:init --name anim-test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name walk', tmpDir);

    // Add frames
    pxc('frame:add --canvas walk --count 3', tmpDir);

    // Draw different content per frame
    pxc('draw:rect --x 0 --y 0 --width 4 --height 4 --color "#ff0000" --fill --canvas walk --frame frame-001', tmpDir);
    pxc('draw:rect --x 2 --y 2 --width 4 --height 4 --color "#00ff00" --fill --canvas walk --frame frame-002', tmpDir);
    pxc('draw:rect --x 4 --y 4 --width 4 --height 4 --color "#0000ff" --fill --canvas walk --frame frame-003', tmpDir);

    // Export spritesheet
    const sheetDest = path.join(tmpDir, 'walk-sheet.png');
    const sheetResult = pxcJSON(`export:spritesheet --canvas walk --dest "${sheetDest}" --layout horizontal`, tmpDir) as { result: { sheetWidth: number; frameCount: number } };
    expect(sheetResult.result.frameCount).toBe(4);
    expect(sheetResult.result.sheetWidth).toBe(32); // 4 frames * 8px

    expect(fs.existsSync(sheetDest)).toBe(true);
    expect(fs.existsSync(sheetDest.replace('.png', '.json'))).toBe(true);
  });

  it('palette validation catches non-palette colors', () => {
    pxc('project:init --name pal-test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name test', tmpDir);
    pxc('palette:create --name strict --colors "#ff0000,#00ff00"', tmpDir);

    // Draw a non-palette color
    pxc('draw:pixel --x 0 --y 0 --color "#0000ff" --canvas test', tmpDir);

    const valResult = pxcJSON('validate:palette --canvas test --palette strict', tmpDir) as {
      result: { results: Array<{ passed: boolean; violations: number }> };
    };
    expect(valResult.result.results[0].passed).toBe(false);
    expect(valResult.result.results[0].violations).toBeGreaterThan(0);
  });

  it('import:png creates valid canvas', () => {
    pxc('project:init --name import-test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name source', tmpDir);
    pxc('draw:rect --x 0 --y 0 --width 8 --height 8 --color "#ff0000" --fill --canvas source', tmpDir);

    const exportPath = path.join(tmpDir, 'export.png');
    pxc(`export:png --canvas source --dest "${exportPath}"`, tmpDir);

    pxc(`import:png --file "${exportPath}" --name reimported`, tmpDir);

    const info = pxcJSON('canvas:info --canvas reimported', tmpDir) as {
      result: { width: number; height: number };
    };
    expect(info.result.width).toBe(8);
    expect(info.result.height).toBe(8);
  });

  it('all commands return valid JSON with --output json', { timeout: 30000 }, () => {
    pxc('project:init --name json-test', tmpDir);
    pxc('canvas:create --width 8 --height 8 --name test', tmpDir);
    pxc('palette:create --name pal --colors "#ff0000"', tmpDir);

    const commands = [
      'project:info',
      'canvas:info --canvas test',
      'layer:list --canvas test',
      'frame:list --canvas test',
      'palette:list',
    ];

    for (const cmd of commands) {
      const result = pxcJSON(cmd, tmpDir);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('duration');
    }
  });

  it('.pxc directory structure matches specification', () => {
    pxc('project:init --name struct-test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name hero', tmpDir);
    pxc('palette:create --name main --colors "#ff0000,#00ff00"', tmpDir);

    const pxcDir = path.join(tmpDir, 'struct-test.pxc');

    // Root structure
    expect(fs.existsSync(path.join(pxcDir, 'project.json'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'palettes'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'canvases'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'tilesets'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'templates'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'recipes'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'exports'))).toBe(true);

    // Canvas structure
    expect(fs.existsSync(path.join(pxcDir, 'canvases', 'hero', 'canvas.json'))).toBe(true);
    expect(fs.existsSync(path.join(pxcDir, 'canvases', 'hero', 'layers', 'layer-001', 'frame-001.png'))).toBe(true);

    // Palette file
    expect(fs.existsSync(path.join(pxcDir, 'palettes', 'main.palette.json'))).toBe(true);

    // Project.json content
    const project = JSON.parse(fs.readFileSync(path.join(pxcDir, 'project.json'), 'utf-8'));
    expect(project.canvases).toContain('hero');
    expect(project.palettes).toContain('main');
  });

  it('full animation pipeline: create → draw frames → set-timing → export gif → export apng', { timeout: 30000 }, () => {
    pxc('project:init --name anim-full', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name walk', tmpDir);

    // Add frames
    pxc('frame:add --canvas walk --count 3', tmpDir);

    // Draw per frame
    pxc('draw:rect --x 0 --y 0 --width 2 --height 2 --color "#ff0000" --fill --canvas walk --frame frame-001', tmpDir);
    pxc('draw:rect --x 1 --y 1 --width 2 --height 2 --color "#00ff00" --fill --canvas walk --frame frame-002', tmpDir);
    pxc('draw:rect --x 2 --y 2 --width 2 --height 2 --color "#0000ff" --fill --canvas walk --frame frame-003', tmpDir);

    // Set timing
    const timingResult = pxcJSON('animation:set-timing --canvas walk --fps 12', tmpDir);
    expect(timingResult.success).toBe(true);
    expect(timingResult.result.duration).toBe(83);

    // Export GIF
    const gifDest = path.join(tmpDir, 'walk.gif');
    const gifResult = pxcJSON(`export:gif --canvas walk --dest "${gifDest}"`, tmpDir);
    expect(gifResult.success).toBe(true);
    expect(fs.existsSync(gifDest)).toBe(true);
    const gifData = fs.readFileSync(gifDest);
    expect(gifData.subarray(0, 6).toString('ascii')).toBe('GIF89a');

    // Export APNG
    const apngDest = path.join(tmpDir, 'walk.apng');
    const apngResult = pxcJSON(`export:apng --canvas walk --dest "${apngDest}"`, tmpDir);
    expect(apngResult.success).toBe(true);
    expect(fs.existsSync(apngDest)).toBe(true);
    const apngData = fs.readFileSync(apngDest);
    expect(apngData[0]).toBe(137); // PNG signature

    // Frame removal + reindex
    pxc('frame:remove --canvas walk --frame 1', tmpDir);
    const listResult = pxcJSON('frame:list --canvas walk', tmpDir);
    expect(listResult.result.frames).toHaveLength(3);
    expect(listResult.result.frames.map((f: any) => f.id)).toEqual([
      'frame-001', 'frame-002', 'frame-003',
    ]);
  });

  it('full tileset pipeline: create → tilemap → set cells → render → export', { timeout: 30000 }, () => {
    pxc('project:init --name tileset-test', tmpDir);
    pxc('canvas:create --width 32 --height 32 --name terrain', tmpDir);

    // Draw 4 distinct 16x16 tiles
    pxc('draw:rect --x 0 --y 0 --width 16 --height 16 --color "#ff0000" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 16 --y 0 --width 16 --height 16 --color "#00ff00" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 0 --y 16 --width 16 --height 16 --color "#0000ff" --fill --canvas terrain', tmpDir);
    pxc('draw:rect --x 16 --y 16 --width 16 --height 16 --color "#ffff00" --fill --canvas terrain', tmpDir);

    // Create tileset
    const createResult = pxcJSON('tileset:create --name terrain --canvas terrain --tile-width 16 --tile-height 16', tmpDir) as any;
    expect(createResult.success).toBe(true);
    expect(createResult.result.uniqueTiles).toBe(4);

    // Info
    const info = pxcJSON('tileset:info --name terrain', tmpDir) as any;
    expect(info.result.tileCount).toBe(4);

    // Create tilemap
    const tmResult = pxcJSON('tileset:create-tilemap --name terrain --tilemap level1 --width 4 --height 4', tmpDir) as any;
    expect(tmResult.success).toBe(true);

    // Set some cells
    pxc('tileset:set-cell --name terrain --tilemap level1 --x 0 --y 0 --tile 0', tmpDir);
    pxc('tileset:set-cell --name terrain --tilemap level1 --x 1 --y 0 --tile 1', tmpDir);
    pxc('tileset:set-cell --name terrain --tilemap level1 --x 2 --y 0 --tile 2', tmpDir);
    pxc('tileset:set-cell --name terrain --tilemap level1 --x 3 --y 0 --tile 3', tmpDir);

    // Render tilemap
    const renderDest = path.join(tmpDir, 'level1.png');
    const renderResult = pxcJSON(`tileset:render-tilemap --name terrain --tilemap level1 --dest "${renderDest}"`, tmpDir) as any;
    expect(renderResult.success).toBe(true);
    expect(fs.existsSync(renderDest)).toBe(true);

    // Export tileset (tiled format)
    const exportDir = path.join(tmpDir, 'export');
    const exportResult = pxcJSON(`tileset:export --name terrain --dest "${exportDir}" --format tiled`, tmpDir) as any;
    expect(exportResult.success).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'terrain.png'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'terrain.json'))).toBe(true);

    // Export tilemap as CSV
    const csvDest = path.join(tmpDir, 'level1.csv');
    const csvResult = pxcJSON(`tileset:export-tilemap --name terrain --tilemap level1 --dest "${csvDest}" --format csv`, tmpDir) as any;
    expect(csvResult.success).toBe(true);
    const csv = fs.readFileSync(csvDest, 'utf-8');
    expect(csv.split('\n')[0]).toBe('0,1,2,3');
  });

  it('animation tag pipeline: create → edit → list → set-timing by tag → remove', { timeout: 30000 }, () => {
    pxc('project:init --name tag-test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name walk', tmpDir);
    pxc('frame:add --canvas walk --count 5', tmpDir);

    // Create tags
    pxc('animation:create-tag --canvas walk --name idle --from 0 --to 1 --direction forward', tmpDir);
    pxc('animation:create-tag --canvas walk --name run --from 2 --to 5 --direction pingpong --repeat 2', tmpDir);

    // List tags
    const listResult = pxcJSON('animation:list-tags --canvas walk', tmpDir) as any;
    expect(listResult.result.count).toBe(2);
    expect(listResult.result.tags[0].name).toBe('idle');
    expect(listResult.result.tags[1].name).toBe('run');

    // Edit tag
    const editResult = pxcJSON('animation:edit-tag --canvas walk --tag idle --direction pingpong --to 2', tmpDir) as any;
    expect(editResult.success).toBe(true);
    expect(editResult.result.tag.direction).toBe('pingpong');
    expect(editResult.result.tag.to).toBe(2);

    // Set timing by tag
    const timingResult = pxcJSON('animation:set-timing --canvas walk --tag run --fps 12', tmpDir) as any;
    expect(timingResult.success).toBe(true);

    // Export by tag
    const gifDest = path.join(tmpDir, 'run.gif');
    const gifResult = pxcJSON(`export:gif --canvas walk --dest "${gifDest}" --tag run`, tmpDir) as any;
    expect(gifResult.success).toBe(true);
    expect(fs.existsSync(gifDest)).toBe(true);

    // Remove tag
    const removeResult = pxcJSON('animation:remove-tag --canvas walk --tag idle', tmpDir) as any;
    expect(removeResult.success).toBe(true);

    // Verify only 1 tag remains
    const listAfter = pxcJSON('animation:list-tags --canvas walk', tmpDir) as any;
    expect(listAfter.result.count).toBe(1);
    expect(listAfter.result.tags[0].name).toBe('run');
  });

  it('new M2 commands return valid JSON with --output json', () => {
    pxc('project:init --name json2-test', tmpDir);
    pxc('canvas:create --width 4 --height 4 --name test', tmpDir);
    pxc('frame:add --canvas test --count 2', tmpDir);

    // frame:duplicate
    const dup = pxcJSON('frame:duplicate --canvas test --frame 0', tmpDir);
    expect(dup).toHaveProperty('success');
    expect(dup.success).toBe(true);

    // frame:reorder
    const reorder = pxcJSON('frame:reorder --canvas test --from 0 --to 2', tmpDir);
    expect(reorder.success).toBe(true);

    // animation:set-timing
    const timing = pxcJSON('animation:set-timing --canvas test --fps 10', tmpDir);
    expect(timing.success).toBe(true);

    // frame:remove
    const remove = pxcJSON('frame:remove --canvas test --frame 0', tmpDir);
    expect(remove.success).toBe(true);
  });
});
