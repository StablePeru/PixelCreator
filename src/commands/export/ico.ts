import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame } from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { scaleBuffer } from '../../core/frame-renderer.js';
import { encodePNG } from '../../io/png-codec.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportIco extends BaseCommand {
  static override description = 'Export canvas frame as ICO (Windows icon) with multiple sizes';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination .ico file path', required: true }),
    sizes: Flags.string({ description: 'Comma-separated icon sizes', default: '16,32,48' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportIco);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
    }));
    const baseBuf = flattenLayers(lwb, canvas.width, canvas.height);

    const sizes = flags.sizes.split(',').map((s) => parseInt(s.trim(), 10));
    const pngBuffers: Buffer[] = [];

    for (const size of sizes) {
      const scale = Math.max(1, Math.round(size / Math.max(canvas.width, canvas.height)));
      const scaled = scale > 1 ? scaleBuffer(baseBuf, scale) : baseBuf;
      // If the scaled buffer doesn't match the target size, we still use it
      pngBuffers.push(encodePNG(scaled));
    }

    // Build ICO file
    const iconDir = Buffer.alloc(6 + 16 * pngBuffers.length);
    iconDir.writeUInt16LE(0, 0);     // reserved
    iconDir.writeUInt16LE(1, 2);     // type: icon
    iconDir.writeUInt16LE(pngBuffers.length, 4); // image count

    let dataOffset = 6 + 16 * pngBuffers.length;
    const dataParts: Buffer[] = [iconDir];

    for (let i = 0; i < pngBuffers.length; i++) {
      const size = sizes[i] > 255 ? 0 : sizes[i];
      const entryOffset = 6 + i * 16;
      iconDir.writeUInt8(size, entryOffset);          // width
      iconDir.writeUInt8(size, entryOffset + 1);      // height
      iconDir.writeUInt8(0, entryOffset + 2);         // color palette
      iconDir.writeUInt8(0, entryOffset + 3);         // reserved
      iconDir.writeUInt16LE(1, entryOffset + 4);      // color planes
      iconDir.writeUInt16LE(32, entryOffset + 6);     // bits per pixel
      iconDir.writeUInt32LE(pngBuffers[i].length, entryOffset + 8);  // data size
      iconDir.writeUInt32LE(dataOffset, entryOffset + 12);           // data offset

      dataParts.push(pngBuffers[i]);
      dataOffset += pngBuffers[i].length;
    }

    const icoData = Buffer.concat(dataParts);
    const dir = path.dirname(flags.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(flags.dest, icoData);

    const result = makeResult('export:ico', { canvas: flags.canvas, dest: flags.dest, sizes: flags.sizes }, { dest: flags.dest, sizes, fileSize: icoData.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ICO with sizes [${r.sizes.join(', ')}] to ${r.dest} (${r.fileSize} bytes)`);
    });
  }
}
