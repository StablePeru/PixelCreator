import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const BIN = path.resolve('bin/run.js');

function pxc(args: string, cwd: string): string {
  return execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf-8', timeout: 15000 });
}

function pxcJSON(args: string, cwd: string): any {
  const output = pxc(`${args} --output json`, cwd);
  return JSON.parse(output);
}

describe('Recipe Management Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-recipe-'));
    pxc('project:init --name test', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('recipe:create', () => {
    it('creates an empty recipe', () => {
      const result = pxcJSON('recipe:create --name setup --description "Setup recipe"', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('setup');
      expect(result.result.steps).toBe(0);
      expect(result.result.source).toBe('empty');
    });

    it('creates recipe from file', () => {
      const stepsFile = path.join(tmpDir, 'steps.json');
      fs.writeFileSync(stepsFile, JSON.stringify([
        { command: 'canvas:create', args: { width: 8, height: 8, name: 'sprite' } },
        { command: 'draw:rect', args: { canvas: 'sprite', x: 0, y: 0, width: 8, height: 8, color: '#ff0000', fill: true } },
      ]));

      const result = pxcJSON(`recipe:create --name build --from-file "${stepsFile}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.steps).toBe(2);
    });

    it('errors on duplicate name', () => {
      pxc('recipe:create --name dup', tmpDir);
      expect(() => pxc('recipe:create --name dup', tmpDir)).toThrow();
    });

    it('registers recipe in project.json', () => {
      pxc('recipe:create --name myrecipe', tmpDir);
      const project = JSON.parse(
        fs.readFileSync(path.join(tmpDir, 'test.pxc', 'project.json'), 'utf-8')
      );
      expect(project.recipes).toContain('myrecipe');
    });
  });

  describe('recipe:list', () => {
    it('lists empty recipes', () => {
      const result = pxcJSON('recipe:list', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.recipes).toEqual([]);
    });

    it('lists created recipes', () => {
      pxc('recipe:create --name one --description "First"', tmpDir);
      pxc('recipe:create --name two --description "Second"', tmpDir);

      const result = pxcJSON('recipe:list', tmpDir);
      expect(result.result.recipes).toHaveLength(2);
      expect(result.result.recipes[0].name).toBe('one');
      expect(result.result.recipes[1].name).toBe('two');
    });
  });

  describe('recipe:info', () => {
    it('shows recipe details', () => {
      const stepsFile = path.join(tmpDir, 'steps.json');
      fs.writeFileSync(stepsFile, JSON.stringify([
        { command: 'draw:pixel', args: { x: 0, y: 0 }, description: 'First pixel' },
      ]));
      pxc(`recipe:create --name info-test --from-file "${stepsFile}"`, tmpDir);

      const result = pxcJSON('recipe:info --name info-test', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('info-test');
      expect(result.result.steps).toHaveLength(1);
      expect(result.result.steps[0].command).toBe('draw:pixel');
    });

    it('errors on non-existent recipe', () => {
      expect(() => pxc('recipe:info --name nope', tmpDir)).toThrow();
    });
  });

  describe('recipe:delete', () => {
    it('deletes a recipe', () => {
      pxc('recipe:create --name deleteme', tmpDir);
      const result = pxcJSON('recipe:delete --name deleteme', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.deleted).toBe(true);

      // Verify removed from project
      const list = pxcJSON('recipe:list', tmpDir);
      expect(list.result.recipes).toHaveLength(0);
    });

    it('errors on non-existent recipe', () => {
      expect(() => pxc('recipe:delete --name nope', tmpDir)).toThrow();
    });
  });

  describe('recipe:run', () => {
    it('runs a recipe with steps', { timeout: 30000 }, () => {
      const stepsFile = path.join(tmpDir, 'steps.json');
      fs.writeFileSync(stepsFile, JSON.stringify([
        { command: 'canvas:create', args: { width: 4, height: 4, name: 'auto' } },
      ]));
      pxc(`recipe:create --name runner --from-file "${stepsFile}"`, tmpDir);

      const result = pxcJSON('recipe:run --name runner', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.stepsExecuted).toBe(1);
      expect(result.result.stepsFailed).toBe(0);

      // Verify canvas was created
      const info = pxcJSON('canvas:info --canvas auto', tmpDir);
      expect(info.result.width).toBe(4);
    });

    it('dry-run shows commands without executing', () => {
      const stepsFile = path.join(tmpDir, 'steps.json');
      fs.writeFileSync(stepsFile, JSON.stringify([
        { command: 'canvas:create', args: { width: 8, height: 8, name: 'test' } },
      ]));
      pxc(`recipe:create --name dry --from-file "${stepsFile}"`, tmpDir);

      const result = pxcJSON('recipe:run --name dry --dry-run', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.dryRun).toBe(true);
      expect(result.result.results[0].output).toBe('(dry-run)');
    });
  });
});
