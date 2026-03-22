import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SnapshotInfo {
  id: string;
  description: string;
  created: string;
  canvases: string[];
}

function getSnapshotsDir(projectPath: string): string {
  return path.join(projectPath, 'snapshots');
}

export function createSnapshot(
  projectPath: string,
  canvasName: string,
  description: string,
): SnapshotInfo {
  const id = `snap-${Date.now()}`;
  const snapshotDir = path.join(getSnapshotsDir(projectPath), id);
  const canvasSrc = path.join(projectPath, 'canvases', canvasName);

  if (!fs.existsSync(canvasSrc)) {
    throw new Error(`Canvas "${canvasName}" not found`);
  }

  // Copy canvas directory
  const canvasDest = path.join(snapshotDir, 'canvases', canvasName);
  fs.cpSync(canvasSrc, canvasDest, { recursive: true });

  const info: SnapshotInfo = {
    id,
    description,
    created: new Date().toISOString(),
    canvases: [canvasName],
  };

  fs.writeFileSync(path.join(snapshotDir, 'snapshot.json'), JSON.stringify(info, null, 2));
  return info;
}

export function listSnapshots(projectPath: string): SnapshotInfo[] {
  const dir = getSnapshotsDir(projectPath);
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir).filter((e) => {
    const metaPath = path.join(dir, e, 'snapshot.json');
    return fs.existsSync(metaPath);
  });

  return entries
    .map((e) => {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, e, 'snapshot.json'), 'utf-8'));
      return meta as SnapshotInfo;
    })
    .sort((a, b) => b.created.localeCompare(a.created));
}

export function restoreSnapshot(
  projectPath: string,
  snapshotId: string,
  canvasName: string,
): void {
  const snapshotDir = path.join(getSnapshotsDir(projectPath), snapshotId);
  const metaPath = path.join(snapshotDir, 'snapshot.json');

  if (!fs.existsSync(metaPath)) {
    throw new Error(`Snapshot "${snapshotId}" not found`);
  }

  const info: SnapshotInfo = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  if (!info.canvases.includes(canvasName)) {
    throw new Error(`Canvas "${canvasName}" not found in snapshot "${snapshotId}"`);
  }

  const canvasSrc = path.join(snapshotDir, 'canvases', canvasName);
  const canvasDest = path.join(projectPath, 'canvases', canvasName);

  // Remove current canvas and replace with snapshot
  if (fs.existsSync(canvasDest)) {
    fs.rmSync(canvasDest, { recursive: true, force: true });
  }
  fs.cpSync(canvasSrc, canvasDest, { recursive: true });
}

export function deleteSnapshot(projectPath: string, snapshotId: string): void {
  const snapshotDir = path.join(getSnapshotsDir(projectPath), snapshotId);
  if (fs.existsSync(snapshotDir)) {
    fs.rmSync(snapshotDir, { recursive: true, force: true });
  }
}
