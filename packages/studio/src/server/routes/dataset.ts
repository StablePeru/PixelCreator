import { Hono } from 'hono';
import {
  readDatasetIndex,
  addRating,
  deleteRating,
  getDatasetStats,
  exportDatasetJsonl,
  getSnapshotBuffer,
} from '../../dataset/dataset-engine.js';

export const datasetRoutes = new Hono<{ Variables: { projectPath: string } }>();

datasetRoutes.post('/dataset/rate', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas, frame, rating, reason, tags } = body as {
    canvas: string; frame?: number; rating: 'like' | 'dislike';
    reason?: string; tags?: string[];
  };

  if (!canvas || !rating || !['like', 'dislike'].includes(rating)) {
    return c.json({ error: 'canvas and rating (like|dislike) required' }, 400);
  }

  try {
    const entry = addRating(projectPath, canvas, frame ?? 0, rating, reason, tags ?? []);
    return c.json(entry, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

datasetRoutes.get('/dataset', (c) => {
  const projectPath = c.get('projectPath');
  const ratingFilter = c.req.query('rating');
  const tagFilter = c.req.query('tag');

  const index = readDatasetIndex(projectPath);
  let entries = index.entries;

  if (ratingFilter) entries = entries.filter((e) => e.rating === ratingFilter);
  if (tagFilter) entries = entries.filter((e) => e.tags.includes(tagFilter));

  return c.json(entries);
});

datasetRoutes.get('/dataset/stats', (c) => {
  const projectPath = c.get('projectPath');
  return c.json(getDatasetStats(projectPath));
});

datasetRoutes.get('/dataset/export', (c) => {
  const projectPath = c.get('projectPath');
  const format = c.req.query('format') || 'jsonl';

  try {
    if (format === 'jsonl') {
      const jsonl = exportDatasetJsonl(projectPath);
      return new Response(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': 'attachment; filename="dataset.jsonl"',
        },
      });
    }

    // CSV summary
    const index = readDatasetIndex(projectPath);
    const header = 'id,canvas,frame,rating,reason,tags,timestamp\n';
    const rows = index.entries.map((e) =>
      `${e.id},${e.canvasName},${e.frameIndex},${e.rating},"${e.reason || ''}","${e.tags.join(';')}",${e.timestamp}`,
    ).join('\n');
    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dataset.csv"',
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

datasetRoutes.delete('/dataset/:id', (c) => {
  const projectPath = c.get('projectPath');
  const entryId = c.req.param('id');
  const deleted = deleteRating(projectPath, entryId);
  if (!deleted) return c.json({ error: 'Entry not found' }, 404);
  return c.json({ success: true, deleted: entryId });
});

datasetRoutes.get('/dataset/:id/snapshot', (c) => {
  const projectPath = c.get('projectPath');
  const entryId = c.req.param('id');
  const buffer = getSnapshotBuffer(projectPath, entryId);
  if (!buffer) return c.json({ error: 'Snapshot not found' }, 404);
  return new Response(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'image/png' },
  });
});
