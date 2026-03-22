import { useState, useRef, useCallback, useEffect } from 'react';

interface FrameInfo {
  id: string;
  index: number;
  duration: number;
}

export function usePlayback(
  frames: FrameInfo[],
  currentIndex: number,
  setIndex: (index: number) => void,
) {
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(6);
  const [loop, setLoop] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  const play = useCallback(() => {
    if (frames.length <= 1) return;
    setPlaying(true);
  }, [frames.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const stop = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, [setIndex]);

  const stepForward = useCallback(() => {
    const next = currentIndex + 1;
    if (next < frames.length) setIndex(next);
    else if (loop) setIndex(0);
  }, [currentIndex, frames.length, loop, setIndex]);

  const stepBack = useCallback(() => {
    const prev = currentIndex - 1;
    if (prev >= 0) setIndex(prev);
    else if (loop) setIndex(frames.length - 1);
  }, [currentIndex, frames.length, loop, setIndex]);

  // Animation loop
  useEffect(() => {
    if (!playing || frames.length <= 1) return;

    lastTimeRef.current = performance.now();

    const tick = (timestamp: number) => {
      const elapsed = timestamp - lastTimeRef.current;
      const frame = frames[currentIndex];
      const duration = fps > 0 ? 1000 / fps : (frame?.duration ?? 100);

      if (elapsed >= duration) {
        lastTimeRef.current = timestamp;
        const next = currentIndex + 1;
        if (next < frames.length) {
          setIndex(next);
        } else if (loop) {
          setIndex(0);
        } else {
          setPlaying(false);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, currentIndex, frames, fps, loop, setIndex]);

  return {
    playing, play, pause, stop,
    stepForward, stepBack,
    fps, setFps,
    loop, setLoop,
    onionSkin, setOnionSkin,
  };
}
