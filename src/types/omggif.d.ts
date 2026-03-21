declare module 'omggif' {
  export class GifReader {
    constructor(buf: Uint8Array);
    width: number;
    height: number;
    numFrames(): number;
    frameInfo(frameIndex: number): {
      x: number;
      y: number;
      width: number;
      height: number;
      has_local_palette: boolean;
      palette_offset: number | null;
      palette_size: number | null;
      data_offset: number;
      data_length: number;
      transparent_index: number | null;
      interlaced: boolean;
      delay: number;
      disposal: number;
    };
    decodeAndBlitFrameRGBA(frameIndex: number, pixels: Uint8Array): void;
  }
}
