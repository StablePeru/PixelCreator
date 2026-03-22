import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { PluginManifest, PluginInfo } from '../types/plugin.js';

export function getPluginsDir(projectPath: string): string {
  return path.join(projectPath, 'plugins');
}

export function getUserPluginsDir(): string {
  return path.join(os.homedir(), '.pxc', 'plugins');
}

export function discoverPlugins(projectPath?: string): PluginInfo[] {
  const plugins: PluginInfo[] = [];

  // Project-level plugins
  if (projectPath) {
    const projectPluginsDir = getPluginsDir(projectPath);
    if (fs.existsSync(projectPluginsDir)) {
      for (const entry of fs.readdirSync(projectPluginsDir)) {
        const pluginPath = path.join(projectPluginsDir, entry);
        const manifest = readManifest(pluginPath);
        if (manifest) {
          plugins.push({
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            enabled: true,
            path: pluginPath,
            source: 'project',
            manifest,
          });
        }
      }
    }
  }

  // User-level plugins
  const userPluginsDir = getUserPluginsDir();
  if (fs.existsSync(userPluginsDir)) {
    for (const entry of fs.readdirSync(userPluginsDir)) {
      const pluginPath = path.join(userPluginsDir, entry);
      const manifest = readManifest(pluginPath);
      if (manifest && !plugins.find((p) => p.name === manifest.name)) {
        plugins.push({
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          enabled: true,
          path: pluginPath,
          source: 'user',
          manifest,
        });
      }
    }
  }

  return plugins;
}

export function readManifest(pluginPath: string): PluginManifest | null {
  const manifestPath = path.join(pluginPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!data.name || !data.version || !data.pixelcreator) return null;
    return data as PluginManifest;
  } catch {
    return null;
  }
}

export function validateManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];
  if (!manifest.name) errors.push('Missing name');
  if (!manifest.version) errors.push('Missing version');
  if (!manifest.pixelcreator) errors.push('Missing pixelcreator config');
  if (!manifest.pixelcreator?.minVersion) errors.push('Missing pixelcreator.minVersion');
  return errors;
}

export function installPlugin(sourcePath: string, destDir: string): PluginManifest {
  const manifest = readManifest(sourcePath);
  if (!manifest) throw new Error('Invalid plugin: missing or invalid manifest.json');

  const errors = validateManifest(manifest);
  if (errors.length > 0) throw new Error(`Invalid manifest: ${errors.join(', ')}`);

  const pluginDest = path.join(destDir, manifest.name);
  if (fs.existsSync(pluginDest)) throw new Error(`Plugin "${manifest.name}" already installed`);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourcePath, pluginDest, { recursive: true });

  return manifest;
}

export function uninstallPlugin(pluginName: string, pluginsDir: string): void {
  const pluginPath = path.join(pluginsDir, pluginName);
  if (!fs.existsSync(pluginPath)) throw new Error(`Plugin "${pluginName}" not found`);
  fs.rmSync(pluginPath, { recursive: true, force: true });
}

export function createPluginScaffold(name: string, destPath: string): void {
  if (fs.existsSync(destPath)) throw new Error(`Directory "${destPath}" already exists`);

  fs.mkdirSync(destPath, { recursive: true });

  const manifest: PluginManifest = {
    name,
    version: '0.1.0',
    description: `${name} plugin for PixelCreator`,
    pixelcreator: { minVersion: '1.0.0' },
    commands: {},
    hooks: {},
  };

  fs.writeFileSync(path.join(destPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(destPath, 'index.js'), `// ${name} plugin entry point\nexport default {};\n`);
}
