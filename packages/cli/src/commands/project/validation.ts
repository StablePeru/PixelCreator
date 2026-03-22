import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, formatOutput, makeResult } from '@pixelcreator/core';
import type { SizeRule } from '@pixelcreator/core';

export default class ProjectValidation extends BaseCommand {
  static description = 'View or update project validation settings';

  static flags = {
    ...BaseCommand.baseFlags,
    'palette-enforcement': Flags.string({
      description: 'Palette enforcement mode: off, warn, error',
      options: ['off', 'warn', 'error'],
    }),
    'add-rule': Flags.string({
      description: 'Add size rule (format: "pattern:type:WxH")',
    }),
    'remove-rule': Flags.integer({
      description: 'Remove size rule by index',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectValidation);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const hasSetter =
      flags['palette-enforcement'] !== undefined ||
      flags['add-rule'] !== undefined ||
      flags['remove-rule'] !== undefined;

    if (!hasSetter) {
      const resultData = {
        validation: project.validation,
        changes: [] as string[],
      };

      const cmdResult = makeResult('project:validation', {}, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log('Validation Settings:');
        this.log(`  Palette enforcement: ${data.validation.paletteEnforcement}`);
        this.log(`  Size rules: ${data.validation.sizeRules.length}`);
        for (let i = 0; i < data.validation.sizeRules.length; i++) {
          const rule = data.validation.sizeRules[i];
          this.log(`    [${i}] ${rule.pattern}:${rule.type}:${rule.width ?? '?'}x${rule.height ?? '?'}`);
        }
      });
      return;
    }

    const changes: string[] = [];

    if (flags['palette-enforcement'] !== undefined) {
      project.validation.paletteEnforcement = flags['palette-enforcement'] as 'off' | 'warn' | 'error';
      changes.push(`Palette enforcement set to "${flags['palette-enforcement']}"`);
    }

    if (flags['add-rule'] !== undefined) {
      const rule = this.parseRule(flags['add-rule']);
      project.validation.sizeRules.push(rule);
      changes.push(`Added size rule: ${flags['add-rule']}`);
    }

    if (flags['remove-rule'] !== undefined) {
      const idx = flags['remove-rule'];
      if (idx < 0 || idx >= project.validation.sizeRules.length) {
        this.error(`Rule index ${idx} out of range (0-${project.validation.sizeRules.length - 1}).`);
      }
      project.validation.sizeRules.splice(idx, 1);
      changes.push(`Removed size rule at index ${idx}`);
    }

    writeProjectJSON(projectPath, project);

    const resultData = {
      validation: project.validation,
      changes,
    };

    const cmdResult = makeResult(
      'project:validation',
      {
        'palette-enforcement': flags['palette-enforcement'],
        'add-rule': flags['add-rule'],
        'remove-rule': flags['remove-rule'],
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log('Validation settings updated:');
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }

  private parseRule(input: string): SizeRule {
    const parts = input.split(':');
    if (parts.length < 3) {
      this.error('Rule format must be "pattern:type:WxH" (e.g. "canvas:exact:16x16").');
    }

    const [pattern, type, sizeStr] = parts;
    const validTypes = ['exact', 'multiple-of', 'max', 'min'];
    if (!validTypes.includes(type)) {
      this.error(`Invalid rule type "${type}". Must be one of: ${validTypes.join(', ')}`);
    }

    const sizeParts = sizeStr.split('x');
    if (sizeParts.length !== 2) {
      this.error('Size must be in "WxH" format (e.g. "16x16").');
    }

    const w = parseInt(sizeParts[0], 10);
    const h = parseInt(sizeParts[1], 10);
    if (isNaN(w) || isNaN(h)) {
      this.error('Width and height must be numbers.');
    }

    const rule: SizeRule = {
      pattern,
      type: type as SizeRule['type'],
    };

    if (type === 'multiple-of') {
      rule.multipleOf = { width: w, height: h };
    } else {
      rule.width = w;
      rule.height = h;
    }

    return rule;
  }
}
