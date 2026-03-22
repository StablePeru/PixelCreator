import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, readPaletteJSON, encodeAse, hexToRGBA, formatOutput, makeResult } from '@pixelcreator/core';
import type { AseExportLayer } from '@pixelcreator/core';

export default class ExportAse extends BaseCommand {
  static override description = 'Export canvas as Aseprite .ase file';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination .ase file path', required: true }),
    tag: Flags.string({ description: 'Export only frames in this animation tag' }),
    palette: Flags.string({ description: 'Include palette by name' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportAse);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let frameIndices = canvas.frames.map((_f, i) => i);

    if (flags.tag) {
      const tag = canvas.animationTags.find((t) => t.name === flags.tag);
      if (!tag) throw new Error(`Tag "${flags.tag}" not found`);
      frameIndices = [];
      for (let i = tag.from; i <= tag.to; i++) frameIndices.push(i);
    }

    const exportLayers: AseExportLayer[] = canvas.layers
      .filter((l) => !l.isGroup)
      .sort((a, b) => a.order - b.order)
      .map((l) => ({
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        frames: frameIndices.map((fi) => readLayerFrame(projectPath, flags.canvas, l.id, canvas.frames[fi].id)),
      }));

    const durations = frameIndices.map((fi) => canvas.frames[fi].duration);
    const tags = flags.tag ? [] : canvas.animationTags;

    let palette;
    if (flags.palette) {
      const palData = readPaletteJSON(projectPath, flags.palette);
      palette = palData.colors.map((c) => hexToRGBA(c.hex));
    }

    const aseData = encodeAse(canvas.width, canvas.height, exportLayers, durations, tags, palette);

    const dir = path.dirname(flags.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(flags.dest, aseData);

    const result = makeResult('export:ase', { canvas: flags.canvas, dest: flags.dest }, { dest: flags.dest, frames: frameIndices.length, layers: exportLayers.length, fileSize: aseData.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.layers} layers, ${r.frames} frames to ${r.dest} (${r.fileSize} bytes)`);
    });
  }
}
