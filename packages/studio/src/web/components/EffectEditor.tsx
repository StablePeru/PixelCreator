interface EffectEditorProps {
  type: string;
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

export function EffectEditor({ type, params, onChange }: EffectEditorProps) {
  const update = (key: string, value: unknown) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="effect-editor">
      {type === 'drop-shadow' && (
        <>
          <label className="effect-editor__field">
            <span>Offset X</span>
            <input type="range" min={-32} max={32} value={Number(params.offsetX ?? 2)} onChange={e => update('offsetX', +e.target.value)} />
            <span>{String(params.offsetX ?? 2)}</span>
          </label>
          <label className="effect-editor__field">
            <span>Offset Y</span>
            <input type="range" min={-32} max={32} value={Number(params.offsetY ?? 2)} onChange={e => update('offsetY', +e.target.value)} />
            <span>{String(params.offsetY ?? 2)}</span>
          </label>
          <label className="effect-editor__field">
            <span>Color</span>
            <input type="color" value={String(params.color ?? '#000000')} onChange={e => update('color', e.target.value)} />
          </label>
          <label className="effect-editor__field">
            <span>Blur</span>
            <input type="range" min={0} max={8} value={Number(params.blur ?? 0)} onChange={e => update('blur', +e.target.value)} />
            <span>{String(params.blur ?? 0)}</span>
          </label>
          <label className="effect-editor__field">
            <span>Opacity</span>
            <input type="range" min={0} max={255} value={Number(params.opacity ?? 128)} onChange={e => update('opacity', +e.target.value)} />
            <span>{String(params.opacity ?? 128)}</span>
          </label>
        </>
      )}

      {type === 'outer-glow' && (
        <>
          <label className="effect-editor__field">
            <span>Color</span>
            <input type="color" value={String(params.color ?? '#ffffff')} onChange={e => update('color', e.target.value)} />
          </label>
          <label className="effect-editor__field">
            <span>Radius</span>
            <input type="range" min={1} max={16} value={Number(params.radius ?? 2)} onChange={e => update('radius', +e.target.value)} />
            <span>{String(params.radius ?? 2)}</span>
          </label>
          <label className="effect-editor__field">
            <span>Intensity</span>
            <input type="range" min={0} max={255} value={Number(params.intensity ?? 200)} onChange={e => update('intensity', +e.target.value)} />
            <span>{String(params.intensity ?? 200)}</span>
          </label>
        </>
      )}

      {type === 'outline' && (
        <>
          <label className="effect-editor__field">
            <span>Color</span>
            <input type="color" value={String(params.color ?? '#000000')} onChange={e => update('color', e.target.value)} />
          </label>
          <label className="effect-editor__field">
            <span>Thickness</span>
            <input type="range" min={1} max={8} value={Number(params.thickness ?? 1)} onChange={e => update('thickness', +e.target.value)} />
            <span>{String(params.thickness ?? 1)}</span>
          </label>
          <label className="effect-editor__field">
            <span>Position</span>
            <select value={String(params.position ?? 'outside')} onChange={e => update('position', e.target.value)}>
              <option value="outside">Outside</option>
              <option value="inside">Inside</option>
              <option value="center">Center</option>
            </select>
          </label>
        </>
      )}

      {type === 'color-overlay' && (
        <>
          <label className="effect-editor__field">
            <span>Color</span>
            <input type="color" value={String(params.color ?? '#ff0000')} onChange={e => update('color', e.target.value)} />
          </label>
          <label className="effect-editor__field">
            <span>Opacity</span>
            <input type="range" min={0} max={255} value={Number(params.opacity ?? 128)} onChange={e => update('opacity', +e.target.value)} />
            <span>{String(params.opacity ?? 128)}</span>
          </label>
        </>
      )}
    </div>
  );
}
