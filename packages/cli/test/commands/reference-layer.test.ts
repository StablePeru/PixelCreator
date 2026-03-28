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

describe('Reference Layer Commands', () => {
  let tmpDir: string;
  let refPng: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-ref-'));
    pxc('project:init --name test', tmpDir);
    pxc('canvas:create --width 16 --height 16 --name canvas', tmpDir);

    // Create a small reference PNG using brush export
    refPng = path.join(tmpDir, 'ref.png');
    pxc(`brush:export --id brush-003 --dest "${refPng}"`, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('layer:add-reference', () => {
    it('adds a reference layer from PNG', () => {
      const result = pxcJSON(`layer:add-reference --canvas canvas --file "${refPng}" --name "Concept"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('Concept');
      expect(result.result.opacity).toBe(128);
    });
  });

  describe('layer:toggle-reference', () => {
    it('toggles reference layer visibility', () => {
      const added = pxcJSON(`layer:add-reference --canvas canvas --file "${refPng}"`, tmpDir);
      const layerId = added.result.id;

      const toggled = pxcJSON(`layer:toggle-reference --canvas canvas --layer ${layerId}`, tmpDir);
      expect(toggled.success).toBe(true);
      expect(toggled.result.visible).toBe(false);

      const toggled2 = pxcJSON(`layer:toggle-reference --canvas canvas --layer ${layerId}`, tmpDir);
      expect(toggled2.result.visible).toBe(true);
    });

    it('rejects non-reference layers', () => {
      expect(() => {
        pxc('layer:toggle-reference --canvas canvas --layer layer-001', tmpDir);
      }).toThrow();
    });
  });

  describe('layer:set-reference-opacity', () => {
    it('sets reference layer opacity', () => {
      const added = pxcJSON(`layer:add-reference --canvas canvas --file "${refPng}"`, tmpDir);
      const result = pxcJSON(`layer:set-reference-opacity --canvas canvas --layer ${added.result.id} --opacity 64`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.opacity).toBe(64);
    });
  });

  describe('layer:fit-reference', () => {
    it('fits reference to canvas', () => {
      const added = pxcJSON(`layer:add-reference --canvas canvas --file "${refPng}"`, tmpDir);
      const result = pxcJSON(`layer:fit-reference --canvas canvas --layer ${added.result.id} --mode contain`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.mode).toBe('contain');
    });
  });

  describe('project:preferences', () => {
    it('sets a preference', () => {
      const result = pxcJSON('project:preferences --key showGuides --value true', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.value).toBe(true);
    });

    it('gets a preference', () => {
      pxc('project:preferences --key snapThreshold --value 8', tmpDir);
      const result = pxcJSON('project:preferences --key snapThreshold', tmpDir);
      expect(result.result.value).toBe(8);
    });

    it('lists all preferences', () => {
      pxc('project:preferences --key showGrid --value true', tmpDir);
      const result = pxcJSON('project:preferences-list', tmpDir);
      expect(result.success).toBe(true);
    });
  });
});
