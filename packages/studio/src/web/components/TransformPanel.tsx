import { useCallback } from 'react';

interface TransformPanelProps {
  canvasName: string | null;
}

export function TransformPanel({ canvasName }: TransformPanelProps) {
  const send = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    if (!canvasName) return;
    await fetch(`/api/transform/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: canvasName, ...body }),
    });
  }, [canvasName]);

  if (!canvasName) return null;

  return (
    <div className="transform-panel">
      <div className="transform-panel__header">Transform</div>
      <div className="transform-panel__actions">
        <button className="transform-panel__btn" onClick={() => send('flip', { direction: 'h' })} title="Flip Horizontal">Flip H</button>
        <button className="transform-panel__btn" onClick={() => send('flip', { direction: 'v' })} title="Flip Vertical">Flip V</button>
        <button className="transform-panel__btn" onClick={() => send('rotate', { turns: 1 })} title="Rotate 90">Rot 90</button>
        <button className="transform-panel__btn" onClick={() => send('invert', {})} title="Invert Colors">Invert</button>
        <button className="transform-panel__btn" onClick={() => send('desaturate', { amount: 100 })} title="Desaturate">Desat</button>
      </div>
    </div>
  );
}
