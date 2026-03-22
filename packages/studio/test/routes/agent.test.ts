import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { AgentBridge } from '../../src/server/agent-bridge.js';
import {
  initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON,
  createEmptyBuffer, writeLayerFrame, ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setup() {
  const canvas: CanvasData = {
    name: 'sprite', width: 8, height: 8,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-agent-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('agent API', () => {
  it('GET /agent/log returns empty initially', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/agent/log');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('GET /agent/commands returns command list', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/agent/commands');
    expect(res.status).toBe(200);
    const cmds = await res.json();
    expect(cmds.length).toBeGreaterThan(20);
    expect(cmds[0]).toHaveProperty('method');
    expect(cmds[0]).toHaveProperty('path');
    expect(cmds[0]).toHaveProperty('description');
  });

  it('AgentBridge logs commands', () => {
    const bridge = new AgentBridge();
    bridge.logCommand({ operation: 'draw:pixel', canvas: 'sprite', success: true, source: 'api' });
    bridge.logCommand({ operation: 'draw:rect', canvas: 'sprite', success: true, source: 'api' });
    expect(bridge.getLog()).toHaveLength(2);
    expect(bridge.getLog()[0].operation).toBe('draw:pixel');
  });

  it('AgentBridge respects max log size', () => {
    const bridge = new AgentBridge();
    for (let i = 0; i < 250; i++) {
      bridge.logCommand({ operation: `op${i}`, success: true, source: 'api' });
    }
    expect(bridge.getLog().length).toBeLessThanOrEqual(200);
  });

  it('AgentBridge logExternalChange creates entry', () => {
    const bridge = new AgentBridge();
    bridge.logExternalChange('sprite');
    const log = bridge.getLog();
    expect(log).toHaveLength(1);
    expect(log[0].source).toBe('external');
    expect(log[0].operation).toBe('canvas:updated');
  });

  it('AgentBridge clear empties log', () => {
    const bridge = new AgentBridge();
    bridge.logCommand({ operation: 'test', success: true, source: 'api' });
    bridge.clear();
    expect(bridge.getLog()).toHaveLength(0);
  });
});
