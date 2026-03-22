import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  readCanvasJSON,
  readLayerFrame,
  flattenLayers,
  encodePNG,
  savePNG,
  loadPNG,
} from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export interface FeedbackEntry {
  id: string;
  canvasName: string;
  frameIndex: number;
  rating: 'like' | 'dislike';
  reason?: string;
  tags: string[];
  timestamp: number;
  metadata: {
    width: number;
    height: number;
    layerCount: number;
    frameCount: number;
    palette?: string;
  };
}

export interface DatasetIndex {
  entries: FeedbackEntry[];
  created: string;
  modified: string;
}

export const FEEDBACK_TAGS = ['composition', 'colors', 'animation', 'style', 'detail', 'proportions'] as const;

function getDatasetDir(projectPath: string): string {
  return path.join(projectPath, 'dataset');
}

function getIndexPath(projectPath: string): string {
  return path.join(getDatasetDir(projectPath), 'dataset.json');
}

function getSnapshotPath(projectPath: string, entryId: string): string {
  return path.join(getDatasetDir(projectPath), 'snapshots', `${entryId}.png`);
}

export function readDatasetIndex(projectPath: string): DatasetIndex {
  const indexPath = getIndexPath(projectPath);
  if (!fs.existsSync(indexPath)) {
    return { entries: [], created: new Date().toISOString(), modified: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

function writeDatasetIndex(projectPath: string, index: DatasetIndex): void {
  const dir = getDatasetDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  index.modified = new Date().toISOString();
  fs.writeFileSync(getIndexPath(projectPath), JSON.stringify(index, null, 2));
}

export function addRating(
  projectPath: string,
  canvasName: string,
  frameIndex: number,
  rating: 'like' | 'dislike',
  reason?: string,
  tags: string[] = [],
): FeedbackEntry {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const frame = canvas.frames[frameIndex];
  if (!frame) throw new Error(`Frame ${frameIndex} not found`);

  // Capture snapshot
  const layers: LayerWithBuffer[] = canvas.layers
    .filter((l) => l.visible)
    .map((l) => ({ info: l, buffer: readLayerFrame(projectPath, canvasName, l.id, frame.id) }));
  const flattened = flattenLayers(layers, canvas.width, canvas.height);

  const entry: FeedbackEntry = {
    id: `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    canvasName,
    frameIndex,
    rating,
    reason: reason || undefined,
    tags,
    timestamp: Date.now(),
    metadata: {
      width: canvas.width,
      height: canvas.height,
      layerCount: canvas.layers.length,
      frameCount: canvas.frames.length,
      palette: canvas.palette || undefined,
    },
  };

  // Save snapshot
  savePNG(flattened, getSnapshotPath(projectPath, entry.id));

  // Append to index
  const index = readDatasetIndex(projectPath);
  index.entries.push(entry);
  writeDatasetIndex(projectPath, index);

  return entry;
}

export function deleteRating(projectPath: string, entryId: string): boolean {
  const index = readDatasetIndex(projectPath);
  const idx = index.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return false;

  index.entries.splice(idx, 1);
  writeDatasetIndex(projectPath, index);

  const snapPath = getSnapshotPath(projectPath, entryId);
  if (fs.existsSync(snapPath)) fs.unlinkSync(snapPath);
  return true;
}

export function getDatasetStats(projectPath: string) {
  const index = readDatasetIndex(projectPath);
  const total = index.entries.length;
  const likes = index.entries.filter((e) => e.rating === 'like').length;
  const dislikes = total - likes;

  const tagCounts: Record<string, number> = {};
  for (const entry of index.entries) {
    for (const tag of entry.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return {
    total,
    likes,
    dislikes,
    likeRatio: total > 0 ? Math.round((likes / total) * 100) : 0,
    tagCounts,
  };
}

export function exportDatasetJsonl(projectPath: string): string {
  const index = readDatasetIndex(projectPath);
  const lines: string[] = [];

  for (const entry of index.entries) {
    const snapPath = getSnapshotPath(projectPath, entry.id);
    let imageBase64 = '';
    if (fs.existsSync(snapPath)) {
      imageBase64 = fs.readFileSync(snapPath).toString('base64');
    }

    lines.push(JSON.stringify({
      image: imageBase64,
      rating: entry.rating,
      reason: entry.reason || '',
      tags: entry.tags,
      canvas: entry.canvasName,
      dimensions: [entry.metadata.width, entry.metadata.height],
      frame_count: entry.metadata.frameCount,
      layer_count: entry.metadata.layerCount,
      palette: entry.metadata.palette || null,
      timestamp: entry.timestamp,
    }));
  }

  return lines.join('\n');
}

export function getSnapshotBuffer(projectPath: string, entryId: string): Buffer | null {
  const snapPath = getSnapshotPath(projectPath, entryId);
  if (!fs.existsSync(snapPath)) return null;
  return fs.readFileSync(snapPath);
}
