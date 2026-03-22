import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  discoverPlugins,
  readManifest,
  validateManifest,
  installPlugin,
  uninstallPlugin,
  createPluginScaffold,
} from '../../src/core/plugin-loader.js';

describe('plugin-loader', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-plugin-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    fs.mkdirSync(projectPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createTestPlugin(dir: string, name: string): string {
    const pluginDir = path.join(dir, name);
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify({
      name,
      version: '1.0.0',
      description: `Test plugin ${name}`,
      pixelcreator: { minVersion: '1.0.0' },
    }));
    return pluginDir;
  }

  it('discovers project-level plugins', () => {
    const pluginsDir = path.join(projectPath, 'plugins');
    createTestPlugin(pluginsDir, 'test-plugin');
    const plugins = discoverPlugins(projectPath);
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe('test-plugin');
    expect(plugins[0].source).toBe('project');
  });

  it('returns empty when no plugins', () => {
    expect(discoverPlugins(projectPath)).toHaveLength(0);
  });

  it('reads manifest correctly', () => {
    const dir = createTestPlugin(tmpDir, 'reader-test');
    const manifest = readManifest(dir);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('reader-test');
    expect(manifest!.version).toBe('1.0.0');
  });

  it('returns null for missing manifest', () => {
    const dir = path.join(tmpDir, 'no-manifest');
    fs.mkdirSync(dir);
    expect(readManifest(dir)).toBeNull();
  });

  it('validates manifest', () => {
    const valid = { name: 'test', version: '1.0.0', description: 'test', pixelcreator: { minVersion: '1.0.0' } };
    expect(validateManifest(valid)).toHaveLength(0);

    const invalid = { name: '', version: '1.0.0', description: 'test', pixelcreator: { minVersion: '1.0.0' } };
    expect(validateManifest(invalid as any).length).toBeGreaterThan(0);
  });

  it('installs plugin', () => {
    const src = createTestPlugin(tmpDir, 'installable');
    const destDir = path.join(projectPath, 'plugins');
    const manifest = installPlugin(src, destDir);
    expect(manifest.name).toBe('installable');
    expect(fs.existsSync(path.join(destDir, 'installable', 'manifest.json'))).toBe(true);
  });

  it('install errors on duplicate', () => {
    const src = createTestPlugin(tmpDir, 'dup-plugin');
    const destDir = path.join(projectPath, 'plugins');
    installPlugin(src, destDir);
    expect(() => installPlugin(src, destDir)).toThrow('already installed');
  });

  it('uninstalls plugin', () => {
    const destDir = path.join(projectPath, 'plugins');
    createTestPlugin(destDir, 'to-remove');
    uninstallPlugin('to-remove', destDir);
    expect(fs.existsSync(path.join(destDir, 'to-remove'))).toBe(false);
  });

  it('uninstall errors on missing', () => {
    const destDir = path.join(projectPath, 'plugins');
    fs.mkdirSync(destDir, { recursive: true });
    expect(() => uninstallPlugin('nonexistent', destDir)).toThrow('not found');
  });

  it('creates plugin scaffold', () => {
    const dest = path.join(tmpDir, 'new-plugin');
    createPluginScaffold('my-plugin', dest);
    expect(fs.existsSync(path.join(dest, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'index.js'))).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(dest, 'manifest.json'), 'utf-8'));
    expect(manifest.name).toBe('my-plugin');
  });
});
