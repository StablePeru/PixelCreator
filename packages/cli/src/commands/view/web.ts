import * as http from 'node:http';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, renderToHtml, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ViewWeb extends BaseCommand {
  static description = 'Serve a canvas preview in the browser via local HTTP server';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    port: Flags.integer({
      description: 'HTTP server port',
      default: 3000,
    }),
    timeout: Flags.integer({
      description: 'Auto-close after N seconds (0 = indefinite)',
      default: 0,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ViewWeb);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frameId = canvas.frames[0]?.id;
    if (!frameId) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
      info: layerInfo,
      buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
    }));

    const buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    const html = renderToHtml(buffer, {
      scale: 10,
      grid: false,
      title: `${flags.canvas} — PixelCreator Preview`,
    });

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    const resultData = {
      port: flags.port,
      canvas: flags.canvas,
    };

    const cmdResult = makeResult(
      'view:web',
      { canvas: flags.canvas, port: flags.port, timeout: flags.timeout },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Serving "${data.canvas}" at http://localhost:${data.port}`);
      this.log(`Press Ctrl+C to stop.`);
      if (flags.timeout > 0) {
        this.log(`Auto-closing in ${flags.timeout} seconds.`);
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(flags.port, () => {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

        if (flags.timeout > 0) {
          timeoutHandle = setTimeout(() => {
            server.close(() => resolve());
          }, flags.timeout * 1000);
        }

        const shutdown = (): void => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          server.close(() => resolve());
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      });
    });
  }
}
