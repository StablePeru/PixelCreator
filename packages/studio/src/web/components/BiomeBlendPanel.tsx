import { useEffect, useState, useCallback } from 'react';

interface BiomeBlendAsset {
  name: string;
  type: string;
  valid: boolean;
  error?: string;
  sourceCanvas?: string;
  targetCanvas?: string;
  tileSize?: { width: number; height: number };
  blendMode?: string;
  blendStrength?: number;
  includeInverse?: boolean;
}

interface AssetListResponse {
  assets: BiomeBlendAsset[];
}

export function BiomeBlendPanel() {
  const [assets, setAssets] = useState<BiomeBlendAsset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(2);
  const [cacheBust, setCacheBust] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/asset');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AssetListResponse;
      const blends = data.assets.filter((a) => a.type === 'biome-blend');
      setAssets(blends);
      if (!selected && blends.length > 0) setSelected(blends[0].name);
      if (selected && !blends.some((a) => a.name === selected)) {
        setSelected(blends[0]?.name ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const current = assets.find((a) => a.name === selected) ?? null;

  if (loading && assets.length === 0) {
    return <div style={dimStyle}>Loading biome-blend assets…</div>;
  }

  if (error) {
    return (
      <div style={dimStyle}>
        <div style={{ color: '#ff6464' }}>Error: {error}</div>
        <button onClick={refresh} style={btnStyle}>
          Retry
        </button>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div style={dimStyle}>
        No biome-blend assets yet. Create one with:
        <pre style={preStyle}>
          pxc asset:init --type biome-blend{'\n'}
          {'  '}--name grass_to_sand{'\n'}
          {'  '}--source-canvas grass --target-canvas sand{'\n'}
          {'  '}--tile-size 16x16
        </pre>
        <button onClick={refresh} style={btnStyle}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select
          value={selected ?? ''}
          onChange={(e) => setSelected(e.target.value || null)}
          style={selectStyle}
        >
          {assets.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            refresh();
            setCacheBust((n) => n + 1);
          }}
          style={btnStyle}
          title="Refresh asset list and preview"
        >
          ↻
        </button>
      </div>

      {current && (
        <>
          <div style={metaStyle}>
            <div>
              <span style={labelStyle}>source</span> {current.sourceCanvas ?? '—'}
            </div>
            <div>
              <span style={labelStyle}>target</span> {current.targetCanvas ?? '—'}
            </div>
            <div>
              <span style={labelStyle}>tile</span>{' '}
              {current.tileSize ? `${current.tileSize.width}×${current.tileSize.height}` : '—'}
            </div>
            <div>
              <span style={labelStyle}>mode</span> {current.blendMode ?? '—'}{' '}
              <span style={{ opacity: 0.6 }}>
                (strength {current.blendStrength ?? '—'}
                {current.includeInverse ? ', ±inverse' : ''})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
            <span style={labelStyle}>zoom</span>
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setPreviewScale(s)}
                style={{
                  ...btnStyle,
                  ...(previewScale === s ? activeBtnStyle : {}),
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <div style={previewWrapStyle}>
            <img
              src={`/api/asset/${encodeURIComponent(current.name)}/biome-blend/preview.png?scale=${previewScale}&v=${cacheBust}`}
              alt={`${current.name} atlas preview`}
              style={{
                imageRendering: 'pixelated',
                maxWidth: '100%',
                display: 'block',
                border: '1px solid #333',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          </div>
          <div style={{ ...dimStyle, marginTop: 6, fontSize: 11 }}>
            47 blob-47 transition tiles (read-only preview; rebuild to disk via{' '}
            <code>pxc asset:build --name {current.name}</code>).
          </div>
        </>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '2px 8px',
  background: 'transparent',
  color: 'inherit',
  border: '1px solid var(--border, #555)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12,
};
const activeBtnStyle: React.CSSProperties = {
  background: 'rgba(74, 144, 226, 0.2)',
  borderColor: 'var(--accent, #4a90e2)',
};
const selectStyle: React.CSSProperties = {
  flex: 1,
  padding: '2px 6px',
  background: 'var(--panel-bg, #1a1a1a)',
  color: 'inherit',
  border: '1px solid var(--border, #555)',
  borderRadius: 3,
  fontSize: 12,
};
const metaStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.6,
  marginBottom: 8,
  opacity: 0.85,
};
const labelStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 52,
  opacity: 0.55,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: 0.4,
};
const previewWrapStyle: React.CSSProperties = {
  overflow: 'auto',
  maxHeight: 280,
  background: '#0a0a0a',
  padding: 4,
};
const preStyle: React.CSSProperties = {
  margin: '6px 0',
  padding: 6,
  background: '#0a0a0a',
  border: '1px solid #222',
  borderRadius: 3,
  fontSize: 10,
  whiteSpace: 'pre',
  overflowX: 'auto',
};
const dimStyle: React.CSSProperties = { opacity: 0.7, fontSize: 12, padding: 8 };
