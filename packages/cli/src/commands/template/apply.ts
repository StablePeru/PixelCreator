import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readTemplateJSON, writeCanvasJSON, ensureCanvasStructure, applyTemplate, formatOutput, makeResult } from '@pixelcreator/core';

export default class TemplateApply extends BaseCommand {
  static description = 'Create a new canvas from a template';

  static flags = {
    ...BaseCommand.baseFlags,
    template: Flags.string({
      char: 't',
      description: 'Template name',
      required: true,
    }),
    canvas: Flags.string({
      char: 'c',
      description: 'New canvas name',
      required: true,
    }),
    width: Flags.integer({
      description: 'Override template width',
    }),
    height: Flags.integer({
      description: 'Override template height',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TemplateApply);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.templates.includes(flags.template)) {
      this.error(`Template "${flags.template}" not found.`);
    }

    if (project.canvases.includes(flags.canvas)) {
      this.error(`Canvas "${flags.canvas}" already exists.`);
    }

    const template = readTemplateJSON(projectPath, flags.template);
    const canvas = applyTemplate(template, flags.canvas, flags.width, flags.height);

    writeCanvasJSON(projectPath, flags.canvas, canvas);
    ensureCanvasStructure(projectPath, flags.canvas, canvas);

    project.canvases.push(flags.canvas);
    writeProjectJSON(projectPath, project);

    const resultData = {
      canvas: flags.canvas,
      template: flags.template,
      width: canvas.width,
      height: canvas.height,
      layers: canvas.layers.length,
    };

    const cmdResult = makeResult('template:apply', {
      template: flags.template, canvas: flags.canvas, width: flags.width, height: flags.height,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.canvas}" created from template "${data.template}"`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Layers: ${data.layers}`);
    });
  }
}
