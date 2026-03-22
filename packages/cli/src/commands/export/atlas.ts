import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, composeSpritesheet, savePNG, scaleBuffer, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ExportAtlas extends BaseCommand {
  static override description = 'Export canvas as texture atlas for game engines (Unity/Godot/Generic)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination directory', required: true }),
    format: Flags.string({ description: 'Atlas format', default: 'generic', options: ['unity', 'godot', 'generic'] }),
    tag: Flags.string({ description: 'Export only frames in this tag' }),
    scale: Flags.integer({ description: 'Scale factor', default: 1 }),
    margin: Flags.integer({ description: 'Outer margin in pixels', default: 0 }),
    padding: Flags.integer({ description: 'Per-frame padding in pixels', default: 0 }),
    columns: Flags.integer({ description: 'Grid columns', default: 4 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportAtlas);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let frameIndices = canvas.frames.map((_f, i) => i);
    let tags = canvas.animationTags;

    if (flags.tag) {
      const tag = canvas.animationTags.find((t) => t.name === flags.tag);
      if (!tag) throw new Error(`Tag "${flags.tag}" not found`);
      frameIndices = [];
      for (let i = tag.from; i <= tag.to; i++) frameIndices.push(i);
      tags = [tag];
    }

    // Render frames
    const renderedFrames = frameIndices.map((fi) => {
      const frameId = canvas.frames[fi].id;
      const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
        info: l,
        buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
      }));
      let buf = flattenLayers(lwb, canvas.width, canvas.height);
      if (flags.scale > 1) buf = scaleBuffer(buf, flags.scale);
      return buf;
    });

    const frameW = canvas.width * flags.scale;
    const frameH = canvas.height * flags.scale;
    const durations = frameIndices.map((fi) => canvas.frames[fi].duration);

    const { buffer: sheetBuffer, metadata } = composeSpritesheet(
      renderedFrames, frameW, frameH, durations, tags,
      { layout: 'grid', columns: flags.columns, spacing: 0, margin: flags.margin, padding: flags.padding },
    );

    if (!fs.existsSync(flags.dest)) fs.mkdirSync(flags.dest, { recursive: true });

    const baseName = flags.canvas;
    const pngPath = path.join(flags.dest, `${baseName}.png`);
    savePNG(sheetBuffer, pngPath);

    // Generate format-specific metadata
    let metaPath: string;
    let metaContent: string;

    if (flags.format === 'unity') {
      metaPath = path.join(flags.dest, `${baseName}.json`);
      const unityMeta = {
        meta: { image: `${baseName}.png`, size: { w: metadata.size.width, h: metadata.size.height }, scale: flags.scale },
        frames: Object.fromEntries(metadata.frames.map((f, i) => [
          `${baseName}_${String(i).padStart(3, '0')}`,
          { frame: { x: f.x, y: f.y, w: f.w, h: f.h }, rotated: false, trimmed: false, duration: f.duration },
        ])),
      };
      metaContent = JSON.stringify(unityMeta, null, 2);
    } else if (flags.format === 'godot') {
      metaPath = path.join(flags.dest, `${baseName}.tres`);
      const lines = [`[gd_resource type="SpriteFrames" format=3]`, ``, `[resource]`];
      lines.push(`animations = [{`);
      lines.push(`"frames": [`);
      for (const f of metadata.frames) {
        lines.push(`  {"texture": preload("${baseName}.png"), "region": Rect2(${f.x}, ${f.y}, ${f.w}, ${f.h}), "duration": ${f.duration / 1000.0}},`);
      }
      lines.push(`],`);
      lines.push(`"loop": true,`);
      lines.push(`"name": &"${baseName}",`);
      lines.push(`"speed": ${1000.0 / (durations[0] || 100)}`);
      lines.push(`}]`);
      metaContent = lines.join('\n');
    } else {
      metaPath = path.join(flags.dest, `${baseName}.atlas.json`);
      metaContent = JSON.stringify({ ...metadata, image: `${baseName}.png`, format: 'generic' }, null, 2);
    }

    fs.writeFileSync(metaPath, metaContent, 'utf-8');

    const result = makeResult('export:atlas', { canvas: flags.canvas, dest: flags.dest, format: flags.format }, { dest: flags.dest, format: flags.format, frames: metadata.frames.length, sheetSize: metadata.size }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.format} atlas: ${r.frames} frames, ${r.sheetSize.width}x${r.sheetSize.height}px to ${r.dest}`);
    });
  }
}
