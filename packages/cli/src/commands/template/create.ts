import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, writeTemplateJSON, createTemplateFromCanvas, formatOutput, makeResult } from '@pixelcreator/core';
import type { TemplateData } from '@pixelcreator/core';

export default class TemplateCreate extends BaseCommand {
  static description = 'Create a template from a canvas or from scratch';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Template name',
      required: true,
    }),
    'from-canvas': Flags.string({
      description: 'Source canvas to extract template from',
    }),
    width: Flags.integer({
      description: 'Template width (required without --from-canvas)',
    }),
    height: Flags.integer({
      description: 'Template height (required without --from-canvas)',
    }),
    description: Flags.string({
      description: 'Template description',
      default: '',
    }),
    palette: Flags.string({
      description: 'Default palette name',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TemplateCreate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.templates.includes(flags.name)) {
      this.error(`Template "${flags.name}" already exists.`);
    }

    let template: TemplateData;

    if (flags['from-canvas']) {
      if (!project.canvases.includes(flags['from-canvas'])) {
        this.error(`Canvas "${flags['from-canvas']}" not found.`);
      }
      const canvas = readCanvasJSON(projectPath, flags['from-canvas']);
      template = createTemplateFromCanvas(canvas);
      template.name = flags.name;
      template.description = flags.description ?? '';
      if (flags.width) template.width = flags.width;
      if (flags.height) template.height = flags.height;
    } else {
      if (!flags.width || !flags.height) {
        this.error('--width and --height are required when not using --from-canvas.');
      }

      const now = new Date().toISOString();
      template = {
        name: flags.name,
        description: flags.description ?? '',
        width: flags.width,
        height: flags.height,
        palette: flags.palette ?? null,
        layers: [
          {
            name: 'background',
            type: 'normal',
            opacity: 255,
            blendMode: 'normal',
          },
        ],
        tags: {},
        created: now,
        modified: now,
      };
    }

    if (flags.palette) {
      template.palette = flags.palette;
    }

    writeTemplateJSON(projectPath, template);
    project.templates.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      width: template.width,
      height: template.height,
      layers: template.layers.length,
      source: flags['from-canvas'] ?? 'scratch',
    };

    const cmdResult = makeResult('template:create', {
      name: flags.name, 'from-canvas': flags['from-canvas'],
      width: flags.width, height: flags.height, description: flags.description,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Template "${data.name}" created from ${data.source}`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Layers: ${data.layers}`);
    });
  }
}
