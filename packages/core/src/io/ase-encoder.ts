import * as zlib from 'node:zlib';
import type { CanvasData, BlendMode, AnimationTag } from '../types/canvas.js';
import type { RGBA } from '../types/common.js';
import { PixelBuffer } from './png-codec.js';

const ASE_MAGIC = 0xA5E0;
const FRAME_MAGIC = 0xF1FA;
const CHUNK_LAYER = 0x2004;
const CHUNK_CEL = 0x2005;
const CHUNK_TAGS = 0x2018;
const CHUNK_PALETTE = 0x2019;

const BLEND_MODE_MAP: Record<string, number> = {
  normal: 0, multiply: 1, screen: 2, overlay: 3, darken: 4, lighten: 5,
  'color-dodge': 6, 'color-burn': 7, 'hard-light': 8, 'soft-light': 9,
  difference: 10, exclusion: 11, addition: 12, subtract: 13,
};

const DIRECTION_MAP: Record<string, number> = {
  forward: 0, reverse: 1, pingpong: 2,
};

class AseWriter {
  private chunks: Buffer[] = [];
  private pos = 0;

  private alloc(size: number): Buffer {
    const buf = Buffer.alloc(size);
    this.chunks.push(buf);
    this.pos += size;
    return buf;
  }

  writeByte(v: number): void {
    const buf = this.alloc(1);
    buf.writeUInt8(v);
  }

  writeWord(v: number): void {
    const buf = this.alloc(2);
    buf.writeUInt16LE(v);
  }

  writeShort(v: number): void {
    const buf = this.alloc(2);
    buf.writeInt16LE(v);
  }

  writeDword(v: number): void {
    const buf = this.alloc(4);
    buf.writeUInt32LE(v);
  }

  writeBytes(data: Buffer): void {
    this.chunks.push(Buffer.from(data));
    this.pos += data.length;
  }

  writeString(s: string): void {
    const encoded = Buffer.from(s, 'utf-8');
    this.writeWord(encoded.length);
    this.writeBytes(encoded);
  }

  get length(): number { return this.pos; }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export interface AseExportLayer {
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  frames: PixelBuffer[];
}

export function encodeAse(
  width: number,
  height: number,
  layers: AseExportLayer[],
  frameDurations: number[],
  tags: AnimationTag[],
  palette?: RGBA[],
): Buffer {
  const frameCount = frameDurations.length;
  const frameBuffers: Buffer[] = [];

  // Encode each frame
  for (let fi = 0; fi < frameCount; fi++) {
    const frameWriter = new AseWriter();
    let chunkCount = 0;

    // Layer chunks (only in frame 0)
    if (fi === 0) {
      for (const layer of layers) {
        const chunk = buildLayerChunk(layer);
        frameWriter.writeBytes(chunk);
        chunkCount++;
      }
    }

    // Cel chunks for each layer
    for (let li = 0; li < layers.length; li++) {
      const pixelBuf = layers[li].frames[fi];
      if (pixelBuf) {
        const chunk = buildCelChunk(li, pixelBuf);
        frameWriter.writeBytes(chunk);
        chunkCount++;
      }
    }

    // Tags chunk (only in frame 0)
    if (fi === 0 && tags.length > 0) {
      const chunk = buildTagsChunk(tags);
      frameWriter.writeBytes(chunk);
      chunkCount++;
    }

    // Palette chunk (only in frame 0)
    if (fi === 0 && palette && palette.length > 0) {
      const chunk = buildPaletteChunk(palette);
      frameWriter.writeBytes(chunk);
      chunkCount++;
    }

    // Frame header
    const frameData = frameWriter.toBuffer();
    const frameHeader = new AseWriter();
    const frameSize = 16 + frameData.length; // 16 bytes frame header
    frameHeader.writeDword(frameSize);
    frameHeader.writeWord(FRAME_MAGIC);
    frameHeader.writeWord(chunkCount); // old chunks
    frameHeader.writeWord(frameDurations[fi]);
    frameHeader.writeByte(0); // reserved
    frameHeader.writeByte(0); // reserved
    frameHeader.writeDword(chunkCount); // new chunks

    frameBuffers.push(Buffer.concat([frameHeader.toBuffer(), frameData]));
  }

  // File header (128 bytes)
  const header = Buffer.alloc(128);
  const totalFrameData = Buffer.concat(frameBuffers);
  const fileSize = 128 + totalFrameData.length;

  header.writeUInt32LE(fileSize, 0);
  header.writeUInt16LE(ASE_MAGIC, 4);
  header.writeUInt16LE(frameCount, 6);
  header.writeUInt16LE(width, 8);
  header.writeUInt16LE(height, 10);
  header.writeUInt16LE(32, 12); // color depth: RGBA
  header.writeUInt32LE(1, 14); // flags: layer opacity valid
  // bytes 18-27: deprecated speed + zeros
  header.writeUInt8(0, 28); // transparent index
  // bytes 29-127: reserved (already zeros)

  return Buffer.concat([header, totalFrameData]);
}

function buildLayerChunk(layer: AseExportLayer): Buffer {
  const w = new AseWriter();
  const bodyWriter = new AseWriter();

  const flags = (layer.visible ? 1 : 0);
  bodyWriter.writeWord(flags);
  bodyWriter.writeWord(0); // type: normal
  bodyWriter.writeWord(0); // child level
  bodyWriter.writeWord(0); // default width (ignored)
  bodyWriter.writeWord(0); // default height (ignored)
  bodyWriter.writeWord(BLEND_MODE_MAP[layer.blendMode] ?? 0);
  bodyWriter.writeByte(layer.opacity);
  bodyWriter.writeByte(0); // reserved
  bodyWriter.writeByte(0); // reserved
  bodyWriter.writeByte(0); // reserved
  bodyWriter.writeString(layer.name);

  const body = bodyWriter.toBuffer();
  const chunkSize = 6 + body.length;
  w.writeDword(chunkSize);
  w.writeWord(CHUNK_LAYER);
  w.writeBytes(body);

  return w.toBuffer();
}

function buildCelChunk(layerIndex: number, buffer: PixelBuffer): Buffer {
  const w = new AseWriter();
  const bodyWriter = new AseWriter();

  // Compress pixel data
  const rawPixels = Buffer.from(buffer.data);
  const compressed = zlib.deflateSync(rawPixels);

  bodyWriter.writeWord(layerIndex);
  bodyWriter.writeShort(0); // x position
  bodyWriter.writeShort(0); // y position
  bodyWriter.writeByte(255); // opacity
  bodyWriter.writeWord(2); // cel type: compressed
  bodyWriter.writeShort(0); // z-index
  bodyWriter.writeBytes(Buffer.alloc(5)); // reserved
  bodyWriter.writeWord(buffer.width);
  bodyWriter.writeWord(buffer.height);
  bodyWriter.writeBytes(compressed);

  const body = bodyWriter.toBuffer();
  const chunkSize = 6 + body.length;
  w.writeDword(chunkSize);
  w.writeWord(CHUNK_CEL);
  w.writeBytes(body);

  return w.toBuffer();
}

function buildTagsChunk(tags: AnimationTag[]): Buffer {
  const w = new AseWriter();
  const bodyWriter = new AseWriter();

  bodyWriter.writeWord(tags.length);
  bodyWriter.writeBytes(Buffer.alloc(8)); // reserved

  for (const tag of tags) {
    bodyWriter.writeWord(tag.from);
    bodyWriter.writeWord(tag.to);
    bodyWriter.writeByte(DIRECTION_MAP[tag.direction] ?? 0);
    bodyWriter.writeWord(tag.repeat);
    bodyWriter.writeBytes(Buffer.alloc(6)); // reserved + color
    bodyWriter.writeByte(0); // extra byte
    bodyWriter.writeString(tag.name);
  }

  const body = bodyWriter.toBuffer();
  const chunkSize = 6 + body.length;
  w.writeDword(chunkSize);
  w.writeWord(CHUNK_TAGS);
  w.writeBytes(body);

  return w.toBuffer();
}

function buildPaletteChunk(palette: RGBA[]): Buffer {
  const w = new AseWriter();
  const bodyWriter = new AseWriter();

  bodyWriter.writeDword(palette.length);
  bodyWriter.writeDword(0); // first index
  bodyWriter.writeDword(palette.length - 1); // last index
  bodyWriter.writeBytes(Buffer.alloc(8)); // reserved

  for (const color of palette) {
    bodyWriter.writeWord(0); // no name
    bodyWriter.writeByte(color.r);
    bodyWriter.writeByte(color.g);
    bodyWriter.writeByte(color.b);
    bodyWriter.writeByte(color.a);
  }

  const body = bodyWriter.toBuffer();
  const chunkSize = 6 + body.length;
  w.writeDword(chunkSize);
  w.writeWord(CHUNK_PALETTE);
  w.writeBytes(body);

  return w.toBuffer();
}
