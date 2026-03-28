import { StepBackIcon, PlayIcon, PauseIcon, StepForwardIcon, StopIcon, LoopIcon } from './Icons';

interface PlaybackControlsProps {
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  onionSkin: boolean;
  onOnionSkinChange: (on: boolean) => void;
  frameCount: number;
  currentFrame: number;
}

export function PlaybackControls({
  playing,
  onPlay,
  onPause,
  onStop,
  onStepBack,
  onStepForward,
  fps,
  onFpsChange,
  loop,
  onLoopChange,
  onionSkin,
  onOnionSkinChange,
  frameCount,
  currentFrame,
}: PlaybackControlsProps) {
  return (
    <div className="playback">
      <div className="playback__buttons">
        <button className="playback__btn" onClick={onStepBack} title="Step back">
          <StepBackIcon size={12} />
        </button>
        {playing ? (
          <button className="playback__btn playback__btn--active" onClick={onPause} title="Pause">
            <PauseIcon size={12} />
          </button>
        ) : (
          <button
            className="playback__btn"
            onClick={onPlay}
            title="Play"
            disabled={frameCount <= 1}
          >
            <PlayIcon size={12} />
          </button>
        )}
        <button className="playback__btn" onClick={onStepForward} title="Step forward">
          <StepForwardIcon size={12} />
        </button>
        <button className="playback__btn" onClick={onStop} title="Stop">
          <StopIcon size={12} />
        </button>
      </div>

      <div className="playback__separator" />

      <label className="playback__option" title="Loop playback">
        <input type="checkbox" checked={loop} onChange={(e) => onLoopChange(e.target.checked)} />
        <LoopIcon size={12} />
      </label>

      <label className="playback__option">
        <span>FPS</span>
        <input
          type="range"
          min={1}
          max={24}
          value={fps}
          onChange={(e) => onFpsChange(+e.target.value)}
        />
        <span className="playback__value">{fps}</span>
      </label>

      <label className="playback__option" title="Onion skin">
        <input
          type="checkbox"
          checked={onionSkin}
          onChange={(e) => onOnionSkinChange(e.target.checked)}
        />
        <span>Onion</span>
      </label>

      <div className="playback__separator" />

      <span className="playback__info">
        {currentFrame + 1}/{frameCount}
      </span>
    </div>
  );
}
