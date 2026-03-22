import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, writePaletteJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class PaletteEdit extends BaseCommand {
  static description = 'Edit palette colors and properties';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    add: Flags.string({
      description: 'Hex colors to add (comma-separated)',
    }),
    remove: Flags.string({
      description: 'Color indices to remove (comma-separated)',
    }),
    'rename-color': Flags.string({
      description: 'Rename a color (format: "index:name")',
    }),
    'set-group': Flags.string({
      description: 'Set color group (format: "index:group")',
    }),
    description: Flags.string({
      description: 'Set palette description',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteEdit);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    if (!flags.add && !flags.remove && !flags['rename-color'] && !flags['set-group'] && flags.description === undefined) {
      this.error('At least one action flag must be provided (--add, --remove, --rename-color, --set-group, --description).');
    }

    const changes: string[] = [];

    // Handle --description
    if (flags.description !== undefined) {
      palette.description = flags.description;
      changes.push(`Description set to "${flags.description}"`);
    }

    // Handle --remove (before --add to avoid index confusion)
    if (flags.remove) {
      if (palette.constraints.locked) {
        this.error('Palette is locked. Cannot remove colors.');
      }

      const indices = flags.remove.split(',').map((s) => parseInt(s.trim(), 10));
      for (const idx of indices) {
        if (isNaN(idx) || !palette.colors.some((c) => c.index === idx)) {
          this.error(`Color index ${idx} not found in palette.`);
        }
      }

      palette.colors = palette.colors.filter((c) => !indices.includes(c.index));

      // Re-index
      for (let i = 0; i < palette.colors.length; i++) {
        palette.colors[i].index = i;
      }

      // Update ramps: remove references to deleted indices
      for (const ramp of palette.ramps) {
        ramp.indices = ramp.indices.filter((i) => !indices.includes(i));
      }

      changes.push(`Removed ${indices.length} color(s)`);
    }

    // Handle --add
    if (flags.add) {
      if (palette.constraints.locked) {
        this.error('Palette is locked. Cannot add colors.');
      }

      const hexColors = flags.add.split(',').map((s) => s.trim());
      const newCount = palette.colors.length + hexColors.length;

      if (newCount > palette.constraints.maxColors) {
        this.error(`Adding ${hexColors.length} colors would exceed maxColors (${palette.constraints.maxColors}). Current: ${palette.colors.length}.`);
      }

      for (const hex of hexColors) {
        const nextIndex = palette.colors.length;
        palette.colors.push({
          index: nextIndex,
          hex: hex.startsWith('#') ? hex : `#${hex}`,
          name: null,
          group: null,
        });
      }

      changes.push(`Added ${hexColors.length} color(s)`);
    }

    // Handle --rename-color
    if (flags['rename-color']) {
      const colonIdx = flags['rename-color'].indexOf(':');
      if (colonIdx === -1) {
        this.error('--rename-color format must be "index:name".');
      }
      const idx = parseInt(flags['rename-color'].slice(0, colonIdx), 10);
      const newName = flags['rename-color'].slice(colonIdx + 1);
      const color = palette.colors.find((c) => c.index === idx);
      if (!color) {
        this.error(`Color index ${idx} not found in palette.`);
      }
      color.name = newName;
      changes.push(`Renamed color ${idx} to "${newName}"`);
    }

    // Handle --set-group
    if (flags['set-group']) {
      const colonIdx = flags['set-group'].indexOf(':');
      if (colonIdx === -1) {
        this.error('--set-group format must be "index:group".');
      }
      const idx = parseInt(flags['set-group'].slice(0, colonIdx), 10);
      const group = flags['set-group'].slice(colonIdx + 1);
      const color = palette.colors.find((c) => c.index === idx);
      if (!color) {
        this.error(`Color index ${idx} not found in palette.`);
      }
      color.group = group;
      changes.push(`Set group of color ${idx} to "${group}"`);
    }

    writePaletteJSON(projectPath, palette);

    const resultData = {
      name: palette.name,
      colorCount: palette.colors.length,
      changes,
    };

    const cmdResult = makeResult(
      'palette:edit',
      { name: flags.name, add: flags.add, remove: flags.remove, 'rename-color': flags['rename-color'], 'set-group': flags['set-group'], description: flags.description },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette "${data.name}" updated (${data.colorCount} colors)`);
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }
}
