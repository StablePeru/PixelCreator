import * as zlib from 'node:zlib';

export interface AseColor {
  r: number;
  g: number;
  b: number;
  a: number;
  name: string | null;
}

export interface AseLayer {
  index: number;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: number;
  type: 'normal' | 'group';
  childLevel: number;
}

export interface AseCel {
  layerIndex: number;
  frameIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Buffer;
  opacity: number;
}

export interface AseTag {
  name: string;
  from: number;
  to: number;
  direction: 'forward' | 'reverse' | 'pingpong';
  repeat: number;
}

export interface AseFile {
  width: number;
  height: number;
  colorDepth: number;
  frameCount: number;
  frameDurations: number[];
  layers: AseLayer[];
  cels: AseCel[];
  palette: AseColor[];
  tags: AseTag[];
  transparentIndex: number;
}

class AseReader {
  private pos = 0;
  constructor(private buf: Buffer) {}

  get position(): number { return this.pos; }
  get remaining(): number { return this.buf.length - this.pos; }

  seek(pos: number): void { this.pos = pos; }
  skip(n: number): void { this.pos += n; }

  byte(): number { return this.buf[this.pos++]; }

  word(): number {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  short(): number {
    const v = this.buf.readInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  dword(): number {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  bytes(n: number): Buffer {
    const slice = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return Buffer.from(slice);
  }

  string(): string {
    const len = this.word();
    if (len === 0) return '';
    const str = this.buf.toString('utf-8', this.pos, this.pos + len);
    this.pos += len;
    return str;
  }
}

const CHUNK_LAYER = 0x2004;
const CHUNK_CEL = 0x2005;
const CHUNK_TAGS = 0x2018;
const CHUNK_PALETTE_NEW = 0x2019;
const CHUNK_OLD_PALETTE = 0x0004;

export function decodeAse(data: Buffer): AseFile {
  const r = new AseReader(data);

  // Header (128 bytes)
  const fileSize = r.dword();
  const magic = r.word();
  if (magic !== 0xA5E0) {
    throw new Error(`Invalid ASE file: expected magic 0xA5E0, got 0x${magic.toString(16)}`);
  }

  const frameCount = r.word();
  const width = r.word();
  const height = r.word();
  const colorDepth = r.word(); // 32=RGBA, 16=Grayscale, 8=Indexed
  const flags = r.dword();
  r.word(); // deprecated speed
  r.dword(); // 0
  r.dword(); // 0
  const transparentIndex = r.byte();
  r.skip(3); // ignore
  r.word(); // numColors (0 = 256 for old)
  r.skip(8); // pixel ratio
  r.skip(92); // reserved to complete 128 bytes header

  const layers: AseLayer[] = [];
  const cels: AseCel[] = [];
  const tags: AseTag[] = [];
  let palette: AseColor[] = [];
  const frameDurations: number[] = [];

  // Frames
  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameStart = r.position;
    const frameBytes = r.dword();
    const frameMagic = r.word();
    if (frameMagic !== 0xF1FA) {
      throw new Error(`Invalid frame magic at frame ${frameIdx}: 0x${frameMagic.toString(16)}`);
    }

    const oldChunks = r.word();
    const duration = r.word();
    r.skip(2); // reserved
    const newChunks = r.dword();
    const numChunks = newChunks === 0 ? oldChunks : newChunks;

    frameDurations.push(duration);

    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const chunkStart = r.position;
      const chunkSize = r.dword();
      const chunkType = r.word();
      const chunkDataSize = chunkSize - 6; // minus header

      switch (chunkType) {
        case CHUNK_LAYER: {
          const layerFlags = r.word();
          const layerType = r.word(); // 0=normal, 1=group
          const childLevel = r.word();
          r.word(); // default width (ignored)
          r.word(); // default height (ignored)
          const blendMode = r.word();
          const opacity = r.byte();
          r.skip(3); // reserved
          const name = r.string();

          layers.push({
            index: layers.length,
            name,
            visible: (layerFlags & 1) !== 0,
            opacity,
            blendMode,
            type: layerType === 1 ? 'group' : 'normal',
            childLevel,
          });
          break;
        }

        case CHUNK_CEL: {
          const layerIndex = r.word();
          const x = r.short();
          const y = r.short();
          const opacity = r.byte();
          const celType = r.word();
          const zIndex = r.short();
          r.skip(5); // reserved

          if (celType === 0) {
            // Raw cel
            const celW = r.word();
            const celH = r.word();
            const pixelDataSize = chunkSize - 6 - 16 - 4; // approximate
            const pixelData = readCelPixels(r, colorDepth, celW, celH, palette, transparentIndex);
            cels.push({ layerIndex, frameIndex: frameIdx, x, y, width: celW, height: celH, data: pixelData, opacity });
          } else if (celType === 2) {
            // Compressed cel
            const celW = r.word();
            const celH = r.word();
            const compressedSize = chunkSize - 6 - 16 - 4;
            const compressed = r.bytes(compressedSize);
            try {
              const decompressed = zlib.inflateSync(compressed);
              const pixelData = convertPixels(decompressed, colorDepth, celW, celH, palette, transparentIndex);
              cels.push({ layerIndex, frameIndex: frameIdx, x, y, width: celW, height: celH, data: pixelData, opacity });
            } catch {
              // Skip corrupt cel
            }
          } else if (celType === 1) {
            // Linked cel
            const linkedFrame = r.word();
            // Find the original cel for this layer in the linked frame
            const source = cels.find((c) => c.layerIndex === layerIndex && c.frameIndex === linkedFrame);
            if (source) {
              cels.push({ ...source, frameIndex: frameIdx });
            }
          } else {
            // Unknown cel type, skip
            r.seek(chunkStart + chunkSize);
          }
          break;
        }

        case CHUNK_PALETTE_NEW: {
          const palSize = r.dword();
          const firstIdx = r.dword();
          const lastIdx = r.dword();
          r.skip(8); // reserved

          for (let i = firstIdx; i <= lastIdx; i++) {
            const hasName = r.word();
            const cr = r.byte();
            const cg = r.byte();
            const cb = r.byte();
            const ca = r.byte();
            let name: string | null = null;
            if (hasName & 1) {
              name = r.string();
            }
            while (palette.length <= i) {
              palette.push({ r: 0, g: 0, b: 0, a: 255, name: null });
            }
            palette[i] = { r: cr, g: cg, b: cb, a: ca, name };
          }
          break;
        }

        case CHUNK_OLD_PALETTE: {
          if (palette.length === 0) {
            const numPackets = r.word();
            let idx = 0;
            for (let p = 0; p < numPackets; p++) {
              const skip = r.byte();
              idx += skip;
              let count = r.byte();
              if (count === 0) count = 256;
              for (let c = 0; c < count; c++) {
                const cr = r.byte();
                const cg = r.byte();
                const cb = r.byte();
                while (palette.length <= idx) {
                  palette.push({ r: 0, g: 0, b: 0, a: 255, name: null });
                }
                palette[idx] = { r: cr, g: cg, b: cb, a: 255, name: null };
                idx++;
              }
            }
          } else {
            r.seek(chunkStart + chunkSize);
          }
          break;
        }

        case CHUNK_TAGS: {
          const numTags = r.word();
          r.skip(8); // reserved
          for (let t = 0; t < numTags; t++) {
            const from = r.word();
            const to = r.word();
            const dir = r.byte();
            const repeat = r.word();
            r.skip(6); // reserved + color
            r.skip(1); // extra byte
            const name = r.string();

            const directions: Array<'forward' | 'reverse' | 'pingpong'> = ['forward', 'reverse', 'pingpong'];
            tags.push({
              name,
              from,
              to,
              direction: directions[dir] || 'forward',
              repeat,
            });
          }
          break;
        }

        default:
          // Skip unknown chunk
          r.seek(chunkStart + chunkSize);
          break;
      }

      // Ensure we're at the right position for the next chunk
      if (r.position < chunkStart + chunkSize) {
        r.seek(chunkStart + chunkSize);
      }
    }

    // Ensure we're at the end of the frame
    if (r.position < frameStart + frameBytes) {
      r.seek(frameStart + frameBytes);
    }
  }

  return {
    width,
    height,
    colorDepth,
    frameCount,
    frameDurations,
    layers,
    cels,
    palette,
    tags,
    transparentIndex,
  };
}

function readCelPixels(
  r: AseReader,
  colorDepth: number,
  w: number,
  h: number,
  palette: AseColor[],
  transparentIndex: number,
): Buffer {
  const pixelCount = w * h;
  let raw: Buffer;

  switch (colorDepth) {
    case 32: // RGBA
      raw = r.bytes(pixelCount * 4);
      return raw;
    case 16: { // Grayscale
      const grayData = r.bytes(pixelCount * 2);
      return convertGrayscale(grayData, w, h);
    }
    case 8: { // Indexed
      const indexData = r.bytes(pixelCount);
      return convertIndexed(indexData, w, h, palette, transparentIndex);
    }
    default:
      throw new Error(`Unsupported color depth: ${colorDepth}`);
  }
}

function convertPixels(
  raw: Buffer,
  colorDepth: number,
  w: number,
  h: number,
  palette: AseColor[],
  transparentIndex: number,
): Buffer {
  switch (colorDepth) {
    case 32:
      return Buffer.from(raw);
    case 16:
      return convertGrayscale(raw, w, h);
    case 8:
      return convertIndexed(raw, w, h, palette, transparentIndex);
    default:
      throw new Error(`Unsupported color depth: ${colorDepth}`);
  }
}

function convertGrayscale(data: Buffer, w: number, h: number): Buffer {
  const result = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const gray = data[i * 2];
    const alpha = data[i * 2 + 1];
    const idx = i * 4;
    result[idx] = gray;
    result[idx + 1] = gray;
    result[idx + 2] = gray;
    result[idx + 3] = alpha;
  }
  return result;
}

function convertIndexed(
  data: Buffer,
  w: number,
  h: number,
  palette: AseColor[],
  transparentIndex: number,
): Buffer {
  const result = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const palIdx = data[i];
    const idx = i * 4;
    if (palIdx === transparentIndex) {
      result[idx] = 0;
      result[idx + 1] = 0;
      result[idx + 2] = 0;
      result[idx + 3] = 0;
    } else if (palIdx < palette.length) {
      const c = palette[palIdx];
      result[idx] = c.r;
      result[idx + 1] = c.g;
      result[idx + 2] = c.b;
      result[idx + 3] = c.a;
    }
  }
  return result;
}
