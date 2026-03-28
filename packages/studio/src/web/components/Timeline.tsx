import { useState, useCallback, useRef } from 'react';
import { FrameThumb } from './FrameThumb';
import { FrameContextMenu } from './FrameContextMenu';
import { PlaybackControls } from './PlaybackControls';
import { usePlayback } from '../hooks/usePlayback';

interface FrameInfo {
  id: string;
  index: number;
  duration: number;
  label?: string;
}

interface AnimationTag {
  name: string;
  from: number;
  to: number;
}

interface TimelineProps {
  canvasName: string | null;
  frames: FrameInfo[];
  tags: AnimationTag[];
  currentFrame: number;
  onFrameSelect: (index: number) => void;
  onAddFrame: () => void;
}

export function Timeline({
  canvasName,
  frames,
  tags,
  currentFrame,
  onFrameSelect,
  onAddFrame,
}: TimelineProps) {
  const playback = usePlayback(frames, currentFrame, onFrameSelect);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleFrameClick = useCallback(
    (e: React.MouseEvent, frame: FrameInfo) => {
      if (e.shiftKey && lastClickedRef.current !== null) {
        // Range select
        const from = Math.min(lastClickedRef.current, frame.index);
        const to = Math.max(lastClickedRef.current, frame.index);
        const newSet = new Set(selectedIds);
        for (const f of frames) {
          if (f.index >= from && f.index <= to) newSet.add(f.id);
        }
        setSelectedIds(newSet);
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle select
        const newSet = new Set(selectedIds);
        if (newSet.has(frame.id)) newSet.delete(frame.id);
        else newSet.add(frame.id);
        setSelectedIds(newSet);
      } else {
        // Single select
        setSelectedIds(new Set([frame.id]));
      }
      lastClickedRef.current = frame.index;
      onFrameSelect(frame.index);
    },
    [frames, selectedIds, onFrameSelect],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, frame: FrameInfo) => {
      e.preventDefault();
      // Ensure frame is in selection
      if (!selectedIds.has(frame.id)) {
        setSelectedIds(new Set([frame.id]));
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [selectedIds],
  );

  const handleBatchDelete = useCallback(async () => {
    if (!canvasName || selectedIds.size === 0) return;
    setContextMenu(null);
    await fetch(`/api/canvas/${canvasName}/frames/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameIds: [...selectedIds] }),
    });
    setSelectedIds(new Set());
  }, [canvasName, selectedIds]);

  const handleBatchDuration = useCallback(async () => {
    if (!canvasName || selectedIds.size === 0) return;
    setContextMenu(null);
    const input = prompt('Duration (ms):', '100');
    if (!input) return;
    const duration = parseInt(input, 10);
    if (isNaN(duration) || duration < 1) return;
    await fetch(`/api/canvas/${canvasName}/frames/batch-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameIds: [...selectedIds], duration }),
    });
  }, [canvasName, selectedIds]);

  const handleDuplicate = useCallback(async () => {
    if (!canvasName || selectedIds.size === 0) return;
    setContextMenu(null);
    // Duplicate first selected frame
    const firstId = [...selectedIds][0];
    await fetch(`/api/canvas/${canvasName}/frame/${firstId}/duplicate`, { method: 'POST' });
  }, [canvasName, selectedIds]);

  if (!canvasName || frames.length === 0) return null;

  const tagColors = ['#e84040', '#4a8c28', '#5ba3d9', '#f0c040', '#a4de6a', '#9e9e9e'];

  return (
    <div className="timeline">
      <PlaybackControls
        playing={playback.playing}
        onPlay={playback.play}
        onPause={playback.pause}
        onStop={playback.stop}
        onStepBack={playback.stepBack}
        onStepForward={playback.stepForward}
        fps={playback.fps}
        onFpsChange={playback.setFps}
        loop={playback.loop}
        onLoopChange={playback.setLoop}
        onionSkin={playback.onionSkin}
        onOnionSkinChange={playback.setOnionSkin}
        frameCount={frames.length}
        currentFrame={currentFrame}
      />

      {/* Tag bars */}
      {tags.length > 0 && (
        <div className="timeline__tags">
          {tags.map((tag, i) => {
            const totalW = frames.length;
            const left = (tag.from / totalW) * 100;
            const width = ((tag.to - tag.from + 1) / totalW) * 100;
            return (
              <div
                key={tag.name}
                className="timeline__tag"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: tagColors[i % tagColors.length],
                }}
                title={`${tag.name} (${tag.from}-${tag.to})`}
              >
                {tag.name}
              </div>
            );
          })}
        </div>
      )}

      {/* Frame strip */}
      <div className="timeline__frames">
        {frames.map((frame) => (
          <FrameThumb
            key={frame.id}
            canvasName={canvasName}
            frameIndex={frame.index}
            duration={frame.duration}
            active={frame.index === currentFrame}
            selected={selectedIds.has(frame.id)}
            label={frame.label}
            onClick={(e) => handleFrameClick(e, frame)}
            onContextMenu={(e) => handleContextMenu(e, frame)}
          />
        ))}
        <button className="timeline__add" onClick={onAddFrame} title="Add frame">
          +
        </button>
        {selectedIds.size > 1 && (
          <span className="timeline__selection-badge">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <FrameContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={selectedIds.size}
          onDeleteSelected={handleBatchDelete}
          onSetDuration={handleBatchDuration}
          onDuplicateSelected={handleDuplicate}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
