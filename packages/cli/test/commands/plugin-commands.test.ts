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

describe('Plugin Commands', () => {
  let tmpDir: string;
  let pluginDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-plugin-cmd-'));
    pxc('project:init --name test', tmpDir);

    // Create a test plugin scaffold
    pluginDir = path.join(tmpDir, 'test-plugin');
    pxc(`plugin:init --name test-plugin --dest "${pluginDir}"`, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('plugin:init', () => {
    it('creates plugin scaffold', () => {
      expect(fs.existsSync(path.join(pluginDir, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'index.js'))).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf-8'));
      expect(manifest.name).toBe('test-plugin');
    });
  });

  describe('plugin:install', () => {
    it('installs plugin into project', () => {
      const result = pxcJSON(`plugin:install --path "${pluginDir}"`, tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('test-plugin');
    });
  });

  describe('plugin:list', () => {
    it('lists installed plugins', () => {
      pxc(`plugin:install --path "${pluginDir}"`, tmpDir);
      const result = pxcJSON('plugin:list', tmpDir);
      expect(result.result.count).toBe(1);
      expect(result.result.plugins[0].name).toBe('test-plugin');
    });

    it('returns empty when no plugins', () => {
      const result = pxcJSON('plugin:list', tmpDir);
      expect(result.result.count).toBe(0);
    });
  });

  describe('plugin:info', () => {
    it('shows plugin details', () => {
      pxc(`plugin:install --path "${pluginDir}"`, tmpDir);
      const result = pxcJSON('plugin:info --name test-plugin', tmpDir);
      expect(result.success).toBe(true);
      expect(result.result.name).toBe('test-plugin');
      expect(result.result.version).toBe('0.1.0');
    });
  });

  describe('plugin:toggle', () => {
    it('disables plugin', () => {
      pxc(`plugin:install --path "${pluginDir}"`, tmpDir);
      const result = pxcJSON('plugin:toggle --name test-plugin --no-enable', tmpDir);
      expect(result.result.enabled).toBe(false);
    });

    it('enables plugin', () => {
      pxc(`plugin:install --path "${pluginDir}"`, tmpDir);
      pxc('plugin:toggle --name test-plugin --no-enable', tmpDir);
      const result = pxcJSON('plugin:toggle --name test-plugin --enable', tmpDir);
      expect(result.result.enabled).toBe(true);
    });
  });

  describe('plugin:uninstall', () => {
    it('removes plugin', () => {
      pxc(`plugin:install --path "${pluginDir}"`, tmpDir);
      const result = pxcJSON('plugin:uninstall --name test-plugin', tmpDir);
      expect(result.success).toBe(true);

      const list = pxcJSON('plugin:list', tmpDir);
      expect(list.result.count).toBe(0);
    });
  });
});
