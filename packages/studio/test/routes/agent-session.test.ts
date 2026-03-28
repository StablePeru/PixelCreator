import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { AgentBridge } from '../../src/server/agent-bridge.js';
import {
  initProjectStructure,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  createEmptyBuffer,
  writeLayerFrame,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(pp: string) {
  const canvas: CanvasData = {
    name: 'sprite',
    width: 8,
    height: 8,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'Layer 1', type: 'normal', visible: true, opacity: 1, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(pp, 'sprite', canvas);
  writeCanvasJSON(pp, 'sprite', canvas);
  writeLayerFrame(pp, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));

  const proj = readProjectJSON(pp);
  proj.canvases = [{ name: 'sprite', width: 8, height: 8 }];
  writeProjectJSON(pp, proj);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-agent-session-'));
  projectPath = tmpDir;
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas(projectPath);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Agent Session API', () => {
  it('GET /agent/session returns idle when no session', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/agent/session');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('idle');
    expect(data.session).toBeNull();
  });

  it('POST /agent/session/start creates a new session', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    expect(res.status).toBe(201);
    const session = await res.json();
    expect(session.status).toBe('running');
    expect(session.canvas).toBe('sprite');
    expect(session.id).toMatch(/^sess-/);
  });

  it('POST /agent/session/start fails without canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /agent/session/pause pauses a running session', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });

    const res = await app.request('/api/agent/session/pause', { method: 'POST' });
    expect(res.status).toBe(200);
    const session = await res.json();
    expect(session.status).toBe('paused');
  });

  it('POST /agent/session/resume resumes a paused session', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    await app.request('/api/agent/session/pause', { method: 'POST' });

    const res = await app.request('/api/agent/session/resume', { method: 'POST' });
    expect(res.status).toBe(200);
    const session = await res.json();
    expect(session.status).toBe('running');
  });

  it('POST /agent/session/end ends session and returns summary', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });

    const res = await app.request('/api/agent/session/end', { method: 'POST' });
    expect(res.status).toBe(200);
    const summary = await res.json();
    expect(summary.sessionId).toBeDefined();
    expect(summary.canvas).toBe('sprite');
    expect(summary.totalOperations).toBe(0);
  });

  it('cannot start a session when one is already active', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });

    const res = await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    expect(res.status).toBe(409);
  });

  it('GET /agent/session/timeline returns empty operations', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });

    const res = await app.request('/api/agent/session/timeline');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operations).toEqual([]);
  });

  it('GET /agent/session/pending returns null when nothing pending', async () => {
    const bridge = new AgentBridge();
    const app = createApp(projectPath, { agentBridge: bridge });

    await app.request('/api/agent/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });

    const res = await app.request('/api/agent/session/pending');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pending).toBeNull();
  });
});

describe('AgentBridge Session Logic', () => {
  it('registerOperation auto-approves in running mode', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');

    const approved = await bridge.registerOperation('draw:pixel', { x: 0, y: 0, color: '#ff0000' });
    expect(approved).toBe(true);

    const session = bridge.getSession();
    expect(session!.operations).toHaveLength(1);
    expect(session!.operations[0].status).toBe('auto');
    expect(session!.totalAuto).toBe(1);
  });

  it('registerOperation queues in paused mode and resolves on approve', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');
    bridge.pauseSession();

    // Start operation (returns a Promise that will resolve when approved)
    const opPromise = bridge.registerOperation('draw:line', { x1: 0, y1: 0, x2: 7, y2: 7 });

    const pending = bridge.getPendingOperation();
    expect(pending).not.toBeNull();
    expect(pending!.command).toBe('draw:line');

    // Approve it
    bridge.approveOperation(pending!.id);
    const result = await opPromise;
    expect(result).toBe(true);

    const session = bridge.getSession();
    expect(session!.totalApproved).toBe(1);
  });

  it('registerOperation resolves false on reject', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');
    bridge.pauseSession();

    const opPromise = bridge.registerOperation('draw:fill', { x: 0, y: 0, color: '#00ff00' });

    const pending = bridge.getPendingOperation();
    bridge.rejectOperation(pending!.id);

    const result = await opPromise;
    expect(result).toBe(false);

    const session = bridge.getSession();
    expect(session!.totalRejected).toBe(1);
  });

  it('addOperationFeedback attaches feedback to an operation', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');

    await bridge.registerOperation('draw:rect', { x: 0, y: 0, w: 4, h: 4 });

    const session = bridge.getSession();
    const opId = session!.operations[0].id;

    const ok = bridge.addOperationFeedback(opId, {
      rating: 'approve',
      comment: 'Nice rectangle placement',
      tags: ['composition'],
    });
    expect(ok).toBe(true);

    const updated = bridge.getSession();
    expect(updated!.operations[0].feedback).toBeDefined();
    expect(updated!.operations[0].feedback!.comment).toBe('Nice rectangle placement');
  });

  it('endSession rejects pending operations', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');
    bridge.pauseSession();

    const opPromise = bridge.registerOperation('draw:circle', { cx: 4, cy: 4, r: 3 });

    const summary = bridge.endSession();
    expect(summary.totalOperations).toBe(1);

    const result = await opPromise;
    expect(result).toBe(false); // Rejected by session end
  });

  it('session summary includes correct counts', async () => {
    const bridge = new AgentBridge();
    bridge.startSession('sprite');

    // 3 auto-approved operations
    await bridge.registerOperation('draw:pixel', { x: 0, y: 0 });
    await bridge.registerOperation('draw:pixel', { x: 1, y: 1 });
    await bridge.registerOperation('draw:pixel', { x: 2, y: 2 });

    // Add feedback to one
    const session = bridge.getSession();
    bridge.addOperationFeedback(session!.operations[0].id, { rating: 'approve', comment: 'good' });

    const summary = bridge.endSession();
    expect(summary.totalOperations).toBe(3);
    expect(summary.auto).toBe(3);
    expect(summary.feedbackCount).toBe(1);
  });
});
