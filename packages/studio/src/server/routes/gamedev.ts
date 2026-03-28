import { Hono } from 'hono';
import {
  readCanvasJSON,
  exportToGameEngine,
  writeExportFiles,
  validateStateMachine,
  exportGodotAnimationTree,
  exportUnityAnimatorController,
  exportStateMachineGeneric,
} from '@pixelcreator/core';
import type {
  GameEngine,
  GamedevExportOptions,
  AnimationState,
  AnimationStateMachine,
} from '@pixelcreator/core';

export const gamedevRoutes = new Hono<{ Variables: { projectPath: string } }>();

// POST /api/gamedev/export — full export to disk
gamedevRoutes.post('/gamedev/export', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas, engine, scale, includeAnimations } = body as {
    canvas?: string;
    engine?: GameEngine;
    scale?: number;
    includeAnimations?: boolean;
  };

  if (!canvas) return c.json({ error: 'canvas is required' }, 400);
  if (!engine) return c.json({ error: 'engine is required' }, 400);

  try {
    const options: GamedevExportOptions = {
      engine,
      canvas,
      includeAnimations: includeAnimations !== false,
      includeTileset: false,
      scale: scale ?? 1,
      outputDir: '',
    };

    const { files } = exportToGameEngine(projectPath, options);

    // Write to a gamedev-export subdirectory next to the project
    const outputDir = `${projectPath}/../gamedev-export/${canvas}/${engine}`;
    const written = writeExportFiles(outputDir, files);

    return c.json({
      success: true,
      engine,
      canvas,
      scale: options.scale,
      includeAnimations: options.includeAnimations,
      files: written,
      fileCount: written.length,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// GET /api/gamedev/info/:canvas — canvas metadata for game export
gamedevRoutes.get('/gamedev/info/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);

    return c.json({
      canvas: canvasName,
      width: canvas.width,
      height: canvas.height,
      frameCount: canvas.frames.length,
      layerCount: canvas.layers.length,
      layers: canvas.layers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
      })),
      animationTags: canvas.animationTags.map((t) => ({
        name: t.name,
        from: t.from,
        to: t.to,
        direction: t.direction,
      })),
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/gamedev/preview — preview export without writing files
gamedevRoutes.post('/gamedev/preview', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas, engine } = body as { canvas?: string; engine?: GameEngine };

  if (!canvas) return c.json({ error: 'canvas is required' }, 400);

  try {
    const options: GamedevExportOptions = {
      engine: engine ?? 'generic',
      canvas,
      includeAnimations: true,
      includeTileset: false,
      scale: 1,
      outputDir: '',
    };

    const { files } = exportToGameEngine(projectPath, options);

    const fileList = files.map((f) => ({
      name: f.name,
      size:
        typeof f.content === 'string' ? Buffer.byteLength(f.content, 'utf-8') : f.content.length,
      type: f.name.endsWith('.png')
        ? 'image'
        : f.name.endsWith('.tres') || f.name.endsWith('.tscn')
          ? 'godot-resource'
          : 'json',
    }));

    return c.json({
      canvas,
      engine: options.engine,
      files: fileList,
      fileCount: fileList.length,
      totalSize: fileList.reduce((sum, f) => sum + f.size, 0),
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/gamedev/state-machine — export animation state machine
gamedevRoutes.post('/gamedev/state-machine', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    engine,
    states,
    initialState,
  } = body as {
    canvas: string;
    engine: GameEngine;
    states: AnimationState[];
    initialState: string;
  };

  if (!canvasName) return c.json({ error: 'canvas is required' }, 400);
  if (!states || states.length === 0) return c.json({ error: 'states are required' }, 400);

  try {
    const canvasData = readCanvasJSON(projectPath, canvasName);
    const sm: AnimationStateMachine = { name: canvasName, states, initialState };

    const errors = validateStateMachine(sm, canvasData.animationTags);
    if (errors.length > 0) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    let content: string;
    switch (engine) {
      case 'godot':
        content = exportGodotAnimationTree(sm);
        break;
      case 'unity':
        content = JSON.stringify(exportUnityAnimatorController(sm), null, 2);
        break;
      default:
        content = JSON.stringify(exportStateMachineGeneric(sm), null, 2);
        break;
    }

    return c.json({ success: true, engine, content });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
