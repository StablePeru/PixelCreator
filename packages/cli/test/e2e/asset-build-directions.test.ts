import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 30000 });
}

function pxcJSON(args: string, cwd: string): Record<string, unknown> {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

// --- Minimal .tres parser for contractual assertions ---

interface ParsedAnimation {
  name: string;
  speed: number;
  loop: boolean;
  frames: Array<{ region: { x: number; y: number; w: number; h: number }; duration: number }>;
}

function parseTresAnimations(tres: string): ParsedAnimation[] {
  // Extract sub_resource regions by id
  const regions = new Map<string, { x: number; y: number; w: number; h: number }>();
  const subRe = /\[sub_resource type="AtlasTexture" id="(atlas_\d+)"\][^[]*?region = Rect2\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = subRe.exec(tres)) !== null) {
    regions.set(m[1], { x: +m[2], y: +m[3], w: +m[4], h: +m[5] });
  }

  // Extract animations array
  const animLine = tres.match(/animations = \[(.+)\]$/m);
  if (!animLine) return [];

  // Split top-level animation dicts by matching braces
  const raw = animLine[1];
  const anims: ParsedAnimation[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{' && depth++ === 0) start = i;
    if (raw[i] === '}' && --depth === 0 && start >= 0) {
      const block = raw.slice(start, i + 1);

      const nameMatch = block.match(/"name":\s*&"([^"]+)"/);
      const speedMatch = block.match(/"speed":\s*([\d.]+)/);
      const loopMatch = block.match(/"loop":\s*(true|false)/);

      // Extract frame entries
      const frames: ParsedAnimation['frames'] = [];
      const frameRe = /\{\s*"texture":\s*SubResource\("(atlas_\d+)"\),\s*"duration":\s*([\d.]+)\s*\}/g;
      let fm: RegExpExecArray | null;
      while ((fm = frameRe.exec(block)) !== null) {
        const region = regions.get(fm[1]);
        if (region) {
          frames.push({ region, duration: +fm[2] });
        }
      }

      anims.push({
        name: nameMatch ? nameMatch[1] : '',
        speed: speedMatch ? +speedMatch[1] : 0,
        loop: loopMatch ? loopMatch[1] === 'true' : false,
        frames,
      });
      start = -1;
    }
  }
  return anims;
}

// --- Test ---

describe('E2E asset:build — character-spritesheet with directions', () => {
  let tmpDir: string;
  const CANVAS = 'hero';
  const ASSET = 'hero_directions';
  const FRAME_W = 16;
  const FRAME_H = 16;

  // We need 8 frames total (no overlap between animations):
  // idle:   frames 0-1, forward, loop=true, fps=4
  // run:    frames 2-4, reverse, loop=true, fps=8
  // attack: frames 5-7, pingpong, loop=false, fps=10
  //
  // Frame indices in the spritesheet (all 16px wide, horizontal):
  //   0    1    2    3    4    5    6    7
  //  0,0  16,0 32,0 48,0 64,0 80,0 96,0 112,0

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-dir-'));
    // 1. Init project
    pxc('project:init --name test', tmpDir);
    // 2. Create canvas with 16x16
    pxc(`canvas:create --width ${FRAME_W} --height ${FRAME_H} --name ${CANVAS}`, tmpDir);
    // 3. Add 7 extra frames (total 8)
    pxc(`frame:add --canvas ${CANVAS} --count 7`, tmpDir);
    // 4. Draw unique pixel per frame so content is non-empty and distinguishable
    const colors = ['#280000', '#500000', '#780000', '#a00000', '#c80000', '#f00000', '#00aa00', '#0000aa'];
    for (let i = 0; i < 8; i++) {
      const frameId = `frame-${String(i + 1).padStart(3, '0')}`;
      pxc(`draw:rect --x 2 --y 2 --width 12 --height 12 --color "${colors[i]}" --fill --canvas ${CANVAS} --frame ${frameId}`, tmpDir);
    }
    // 5. Write asset spec
    const spec = {
      name: ASSET,
      type: 'character-spritesheet',
      canvas: CANVAS,
      frameSize: { width: FRAME_W, height: FRAME_H },
      animations: [
        { name: 'idle', from: 0, to: 1, fps: 4, direction: 'forward', loop: true },
        { name: 'run', from: 2, to: 4, fps: 8, direction: 'reverse', loop: true },
        { name: 'attack', from: 5, to: 7, fps: 10, direction: 'pingpong', loop: false },
      ],
      export: {
        engine: 'godot',
        scale: 1,
        layout: 'horizontal',
        padding: 0,
      },
    };
    const projectPath = path.join(tmpDir, 'test.pxc');
    const assetsDir = path.join(projectPath, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, `${ASSET}.asset.json`),
      JSON.stringify(spec, null, 2),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('builds Godot export with correct direction-expanded frames', () => {
    // Run CLI
    const destDir = path.join(tmpDir, 'godot-out');
    const result = pxcJSON(`asset:build -n ${ASSET} --dest "${destDir}"`, tmpDir) as {
      result: { files: string[]; engine: string; fileCount: number; warnings: string[] };
    };

    // --- Basic result checks ---
    expect(result.result.engine).toBe('godot');
    expect(result.result.fileCount).toBeGreaterThanOrEqual(4); // sheet.png, .tres, .tscn, .asset.json

    // --- File existence ---
    const sheetPng = path.join(destDir, `${CANVAS}_sheet.png`);
    const tresFile = path.join(destDir, `${CANVAS}.tres`);
    const tscnFile = path.join(destDir, `${CANVAS}.tscn`);
    const specFile = path.join(destDir, `${ASSET}.asset.json`);

    expect(fs.existsSync(sheetPng)).toBe(true);
    expect(fs.existsSync(tresFile)).toBe(true);
    expect(fs.existsSync(tscnFile)).toBe(true);
    expect(fs.existsSync(specFile)).toBe(true);

    // Sheet PNG should be non-trivial
    expect(fs.statSync(sheetPng).size).toBeGreaterThan(50);

    // --- Parse .tres ---
    const tresContent = fs.readFileSync(tresFile, 'utf-8');
    const anims = parseTresAnimations(tresContent);

    expect(anims).toHaveLength(3);
    const animByName = new Map(anims.map((a) => [a.name, a]));

    // --- idle: forward, 2 base frames → 2 output frames ---
    const idle = animByName.get('idle')!;
    expect(idle).toBeDefined();
    expect(idle.speed).toBe(4);
    expect(idle.loop).toBe(true);
    expect(idle.frames).toHaveLength(2);
    // Forward order: frame 0 (x=0), frame 1 (x=16)
    expect(idle.frames[0].region.x).toBe(0);
    expect(idle.frames[1].region.x).toBe(16);
    // Must NOT return back (no extra frames)
    expect(idle.frames.every((f) => f.region.w === FRAME_W && f.region.h === FRAME_H)).toBe(true);

    // --- run: reverse, 3 base frames → 3 output frames in reverse ---
    const run = animByName.get('run')!;
    expect(run).toBeDefined();
    expect(run.speed).toBe(8);
    expect(run.loop).toBe(true);
    expect(run.frames).toHaveLength(3);
    // Reverse order: frame 4 (x=64), frame 3 (x=48), frame 2 (x=32)
    expect(run.frames[0].region.x).toBe(64);
    expect(run.frames[1].region.x).toBe(48);
    expect(run.frames[2].region.x).toBe(32);

    // --- attack: pingpong, 3 base frames → 3 + 1 mirror = 4 output frames ---
    // Base: [5,6,7] → pingpong: [5,6,7,6] (mirror tail without duplicating endpoints)
    const attack = animByName.get('attack')!;
    expect(attack).toBeDefined();
    expect(attack.speed).toBe(10);
    expect(attack.loop).toBe(false);
    expect(attack.frames).toHaveLength(4); // 2*3 - 2 = 4
    // Pingpong order: frame 5 (x=80), frame 6 (x=96), frame 7 (x=112), frame 6 (x=96)
    expect(attack.frames[0].region.x).toBe(80);
    expect(attack.frames[1].region.x).toBe(96);
    expect(attack.frames[2].region.x).toBe(112);
    expect(attack.frames[3].region.x).toBe(96);

    // --- Duration multipliers: all should be 1.0 (uniform timing) ---
    for (const anim of anims) {
      for (const frame of anim.frames) {
        expect(frame.duration).toBeCloseTo(1.0, 5);
      }
    }

    // --- .tres structural checks ---
    expect(tresContent).toContain('[gd_resource type="SpriteFrames" format=3]');
    expect(tresContent).toContain(`res://${CANVAS}_sheet.png`);

    // --- Parse .tscn ---
    const tscnContent = fs.readFileSync(tscnFile, 'utf-8');
    expect(tscnContent).toContain('[gd_scene format=3]');
    expect(tscnContent).toContain('type="AnimatedSprite2D"');
    expect(tscnContent).toContain(`sprite_frames = ExtResource("1")`);
    // Initial animation should be the first one in the spec
    expect(tscnContent).toContain('animation = &"idle"');
    // SpriteFrames and Texture ext_resources
    expect(tscnContent).toContain(`res://${CANVAS}.tres`);
    expect(tscnContent).toContain(`res://${CANVAS}_sheet.png`);

    // --- Exported spec is faithful ---
    const exportedSpec = JSON.parse(fs.readFileSync(specFile, 'utf-8'));
    expect(exportedSpec.name).toBe(ASSET);
    expect(exportedSpec.animations).toHaveLength(3);
    expect(exportedSpec.export.engine).toBe('godot');
  });
});
