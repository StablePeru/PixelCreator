import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, PixelBuffer, encodePNG, decodePNG, colorHistogram, scaleBuffer, scaleBufferBilinear, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

function bench(name: string, fn: () => void, iterations: number = 1): { name: string; ms: number; opsPerSec: number } {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = performance.now() - start;
  return { name, ms: Math.round(ms * 100) / 100, opsPerSec: Math.round(iterations / (ms / 1000)) };
}

export default class ProjectBenchmark extends BaseCommand {
  static override description = 'Run performance benchmarks on a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectBenchmark);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    const benchmarks: Array<{ name: string; ms: number; opsPerSec: number }> = [];

    // 1. Flatten layers
    const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
    }));
    benchmarks.push(bench('flattenLayers', () => flattenLayers(lwb, canvas.width, canvas.height), 10));

    // 2. PNG encode/decode round-trip
    const flatBuf = flattenLayers(lwb, canvas.width, canvas.height);
    benchmarks.push(bench('PNG encode', () => encodePNG(flatBuf), 10));
    const encoded = encodePNG(flatBuf);
    benchmarks.push(bench('PNG decode', () => decodePNG(encoded), 10));

    // 3. Scale nearest
    benchmarks.push(bench('scaleNearest 2x', () => scaleBuffer(flatBuf, 2), 10));

    // 4. Scale bilinear
    benchmarks.push(bench('scaleBilinear 2x', () => scaleBufferBilinear(flatBuf, canvas.width * 2, canvas.height * 2), 5));

    // 5. Color histogram
    benchmarks.push(bench('colorHistogram', () => colorHistogram(flatBuf), 10));

    // 6. Buffer clone
    benchmarks.push(bench('buffer.clone()', () => flatBuf.clone(), 100));

    // 7. PixelBuffer create
    benchmarks.push(bench(`PixelBuffer ${canvas.width}x${canvas.height}`, () => new PixelBuffer(canvas.width, canvas.height), 100));

    const result = makeResult('project:benchmark', { canvas: flags.canvas }, {
      canvas: flags.canvas,
      dimensions: `${canvas.width}x${canvas.height}`,
      layers: canvas.layers.length,
      benchmarks,
    }, startTime);

    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Benchmark: ${r.canvas} (${r.dimensions}, ${r.layers} layers)\n`);
      console.log('  Operation                        Time (ms)   Ops/sec');
      console.log('  ─────────────────────────────────────────────────────');
      for (const b of r.benchmarks) {
        const name = b.name.padEnd(34);
        const ms = String(b.ms).padStart(8);
        const ops = String(b.opsPerSec).padStart(9);
        console.log(`  ${name} ${ms}   ${ops}`);
      }
    });
  }
}
