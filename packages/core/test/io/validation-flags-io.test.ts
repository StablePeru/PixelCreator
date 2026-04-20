import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getValidationFlagsPath,
  readValidationFlags,
  writeValidationFlags,
} from '../../src/io/project-io.js';
import { addFlag, emptyFlagsFile } from '../../src/core/validation-engine.js';

describe('validation flags I/O', () => {
  let tmpDir: string;
  let projectPath: string;
  const canvas = 'hero';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-validation-io-'));
    projectPath = path.join(tmpDir, 'project.pxc');
    fs.mkdirSync(path.join(projectPath, 'canvases', canvas), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('path lives under canvases/{name}/.validation/flags.json', () => {
    const p = getValidationFlagsPath(projectPath, canvas);
    expect(p.endsWith(path.join('canvases', canvas, '.validation', 'flags.json'))).toBe(true);
  });

  it('read returns empty file when flags.json does not exist', () => {
    const file = readValidationFlags(projectPath, canvas);
    expect(file).toEqual({ version: 1, canvas, flags: [] });
  });

  it('write then read round-trips flags', () => {
    let file = emptyFlagsFile(canvas);
    file = addFlag(file, {
      canvas,
      severity: 'warning',
      category: 'palette',
      note: 'out of palette',
      tags: ['body'],
      now: 1000,
    });
    writeValidationFlags(projectPath, canvas, file);

    const onDisk = readValidationFlags(projectPath, canvas);
    expect(onDisk.flags).toHaveLength(1);
    expect(onDisk.flags[0].id).toBe('flag-001');
    expect(onDisk.flags[0].note).toBe('out of palette');
  });

  it('write creates the .validation directory when missing', () => {
    const file = addFlag(emptyFlagsFile(canvas), {
      canvas,
      severity: 'info',
      category: 'other',
      note: 'observe',
    });
    writeValidationFlags(projectPath, canvas, file);
    expect(fs.existsSync(getValidationFlagsPath(projectPath, canvas))).toBe(true);
  });

  it('read rejects files with mismatched canvas', () => {
    const filePath = getValidationFlagsPath(projectPath, canvas);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ version: 1, canvas: 'villain', flags: [] }),
    );
    expect(() => readValidationFlags(projectPath, canvas)).toThrow(/Invalid validation flags/);
  });

  it('read rejects files with unsupported version', () => {
    const filePath = getValidationFlagsPath(projectPath, canvas);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ version: 2, canvas, flags: [] }));
    expect(() => readValidationFlags(projectPath, canvas)).toThrow(/Invalid validation flags/);
  });
});
