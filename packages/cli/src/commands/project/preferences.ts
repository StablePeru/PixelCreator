import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, formatOutput, makeResult } from '@pixelcreator/core';

const DEFAULT_PREFS = {
  showGrid: true,
  gridSize: 1,
  showGuides: true,
  snapToGuide: true,
  snapThreshold: 4,
  defaultCanvasWidth: 32,
  defaultCanvasHeight: 32,
  defaultBackground: null,
};

export default class ProjectPreferences extends BaseCommand {
  static override description = 'View or set a project preference';

  static override flags = {
    ...BaseCommand.baseFlags,
    key: Flags.string({ description: 'Preference key to set' }),
    value: Flags.string({ description: 'Value to set' }),
    reset: Flags.boolean({ description: 'Reset all preferences to defaults', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectPreferences);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.settings.preferences) {
      project.settings.preferences = { ...DEFAULT_PREFS };
    }

    if (flags.reset) {
      project.settings.preferences = { ...DEFAULT_PREFS };
      writeProjectJSON(projectPath, project);
      const result = makeResult('project:preferences', { reset: true }, { preferences: project.settings.preferences }, startTime);
      const format = this.getOutputFormat(flags);
      formatOutput(format, result, () => { this.log('Preferences reset to defaults'); });
      return;
    }

    if (flags.key && flags.value !== undefined) {
      const prefs = project.settings.preferences as unknown as Record<string, unknown>;
      if (!(flags.key in DEFAULT_PREFS)) {
        throw new Error(`Unknown preference key: ${flags.key}. Valid keys: ${Object.keys(DEFAULT_PREFS).join(', ')}`);
      }

      // Type coercion based on default type
      const defaultVal = (DEFAULT_PREFS as Record<string, unknown>)[flags.key];
      if (typeof defaultVal === 'boolean') {
        prefs[flags.key] = flags.value === 'true';
      } else if (typeof defaultVal === 'number') {
        prefs[flags.key] = parseInt(flags.value, 10);
      } else {
        prefs[flags.key] = flags.value === 'null' ? null : flags.value;
      }

      writeProjectJSON(projectPath, project);
      const result = makeResult('project:preferences', { key: flags.key, value: flags.value }, { key: flags.key, value: prefs[flags.key] }, startTime);
      const format = this.getOutputFormat(flags);
      formatOutput(format, result, (r) => { this.log(`Set ${r.key} = ${r.value}`); });
      return;
    }

    if (flags.key) {
      const prefs = project.settings.preferences as unknown as Record<string, unknown>;
      const val = prefs[flags.key];
      const result = makeResult('project:preferences', { key: flags.key }, { key: flags.key, value: val }, startTime);
      const format = this.getOutputFormat(flags);
      formatOutput(format, result, (r) => { this.log(`${r.key} = ${r.value}`); });
      return;
    }

    const result = makeResult('project:preferences', {}, { preferences: project.settings.preferences }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log('Project preferences:');
      for (const [k, v] of Object.entries(r.preferences)) {
        this.log(`  ${k} = ${v}`);
      }
    });
  }
}
