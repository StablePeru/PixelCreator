import { useState, useCallback } from 'react';

interface Tag {
  name: string;
  from: number;
  to: number;
}

interface TransitionDef {
  fromState: string;
  toState: string;
  condition: string;
}

interface StateMachinePanelProps {
  canvasName: string | null;
  tags: Tag[];
}

export function StateMachinePanel({ canvasName, tags }: StateMachinePanelProps) {
  const [transitions, setTransitions] = useState<TransitionDef[]>([]);
  const [engine, setEngine] = useState<'godot' | 'unity' | 'generic'>('godot');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addTransition = useCallback(() => {
    if (tags.length < 2) return;
    setTransitions((prev) => [
      ...prev,
      {
        fromState: tags[0].name,
        toState: tags[1]?.name ?? tags[0].name,
        condition: '',
      },
    ]);
  }, [tags]);

  const updateTransition = useCallback((index: number, patch: Partial<TransitionDef>) => {
    setTransitions((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }, []);

  const removeTransition = useCallback((index: number) => {
    setTransitions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleExport = useCallback(async () => {
    if (!canvasName || tags.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const states = tags.map((tag) => ({
      name: tag.name,
      tagName: tag.name,
      transitions: transitions.filter((t) => t.fromState === tag.name),
    }));

    try {
      const res = await fetch('/api/gamedev/state-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas: canvasName,
          engine,
          states,
          initialState: tags[0].name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Export failed');
      } else {
        setResult(data.content);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [canvasName, tags, transitions, engine]);

  if (!canvasName || tags.length === 0) {
    return <div className="state-machine-panel">No animation tags defined.</div>;
  }

  return (
    <div className="state-machine-panel">
      <div className="state-machine-panel__states">
        <span className="state-machine-panel__label">States ({tags.length}):</span>
        {tags.map((tag) => (
          <span key={tag.name} className="state-machine-panel__state-chip">
            {tag.name}
          </span>
        ))}
      </div>

      <div className="state-machine-panel__transitions">
        <span className="state-machine-panel__label">Transitions:</span>
        {transitions.map((t, i) => (
          <div key={i} className="state-machine-panel__transition-row">
            <select
              value={t.fromState}
              onChange={(e) => updateTransition(i, { fromState: e.target.value })}
            >
              {tags.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
            <span>&rarr;</span>
            <select
              value={t.toState}
              onChange={(e) => updateTransition(i, { toState: e.target.value })}
            >
              {tags.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="condition"
              value={t.condition}
              onChange={(e) => updateTransition(i, { condition: e.target.value })}
            />
            <button onClick={() => removeTransition(i)} title="Remove">
              &times;
            </button>
          </div>
        ))}
        <button className="state-machine-panel__add-btn" onClick={addTransition}>
          + Add Transition
        </button>
      </div>

      <div className="state-machine-panel__export">
        <select value={engine} onChange={(e) => setEngine(e.target.value as any)}>
          <option value="godot">Godot</option>
          <option value="unity">Unity</option>
          <option value="generic">Generic</option>
        </select>
        <button
          className="state-machine-panel__export-btn"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? 'Exporting...' : 'Export State Machine'}
        </button>
      </div>

      {error && <div className="state-machine-panel__error">{error}</div>}
      {result && (
        <pre className="state-machine-panel__result">
          {result.slice(0, 500)}
          {result.length > 500 ? '...' : ''}
        </pre>
      )}
    </div>
  );
}
