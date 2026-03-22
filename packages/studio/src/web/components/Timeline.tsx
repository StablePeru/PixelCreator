import { useCallback } from 'react';
import { FrameThumb } from './FrameThumb';
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

export function Timeline({ canvasName, frames, tags, currentFrame, onFrameSelect, onAddFrame }: TimelineProps) {
  const playback = usePlayback(frames, currentFrame, onFrameSelect);

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
            label={frame.label}
            onClick={() => onFrameSelect(frame.index)}
          />
        ))}
        <button className="timeline__add" onClick={onAddFrame} title="Add frame">+</button>
      </div>
    </div>
  );
}
