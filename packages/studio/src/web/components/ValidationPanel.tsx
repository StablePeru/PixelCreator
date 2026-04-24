import { useCallback, useState } from 'react';
import type {
  FlagCategory,
  FlagSeverity,
  ReportInclude,
  RunReportOptions,
  ValidationFlag,
  ValidationReport,
} from '../hooks/useValidation';

const SEVERITIES: FlagSeverity[] = ['error', 'warning', 'info'];
const CATEGORIES: FlagCategory[] = [
  'pixel',
  'color',
  'palette',
  'animation',
  'bounds',
  'composition',
  'other',
];

interface Props {
  canvasName: string | null;
  frameIndex: number;
  activeLayerId: string | null;
  flags: ValidationFlag[];
  report: ValidationReport | null;
  selectedRegion: { x: number; y: number; w: number; h: number } | null;
  onCreate: (input: {
    severity: FlagSeverity;
    category: FlagCategory;
    note: string;
    tags: string[];
    frameIndex?: number;
    layerId?: string;
    region?: { x: number; y: number; w: number; h: number };
  }) => Promise<unknown>;
  onResolve: (id: string, resolution: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onRunReport: (options?: RunReportOptions) => Promise<ValidationReport | null>;
  onClearRegion: () => void;
}

export function ValidationPanel({
  canvasName,
  frameIndex,
  activeLayerId,
  flags,
  report,
  selectedRegion,
  onCreate,
  onResolve,
  onRemove,
  onRunReport,
  onClearRegion,
}: Props) {
  const [severity, setSeverity] = useState<FlagSeverity>('warning');
  const [category, setCategory] = useState<FlagCategory>('palette');
  const [note, setNote] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [scopeFrame, setScopeFrame] = useState(true);
  const [scopeLayer, setScopeLayer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [includePalette, setIncludePalette] = useState(false);
  const [includeAccessibility, setIncludeAccessibility] = useState(false);
  const [includeAsset, setIncludeAsset] = useState(false);
  const [paletteOverride, setPaletteOverride] = useState('');

  const submit = useCallback(async () => {
    if (!canvasName) return;
    if (!note.trim()) {
      setError('Note is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        severity,
        category,
        note: note.trim(),
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ...(scopeFrame ? { frameIndex } : {}),
        ...(scopeLayer && activeLayerId ? { layerId: activeLayerId } : {}),
        ...(selectedRegion ? { region: selectedRegion } : {}),
      });
      setNote('');
      setTagsText('');
      onClearRegion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [
    activeLayerId,
    canvasName,
    category,
    frameIndex,
    note,
    onClearRegion,
    onCreate,
    scopeFrame,
    scopeLayer,
    selectedRegion,
    severity,
    tagsText,
  ]);

  const submitResolve = useCallback(
    async (id: string) => {
      if (!resolutionText.trim()) {
        setError('Resolution is required');
        return;
      }
      try {
        await onResolve(id, resolutionText.trim());
        setResolvingId(null);
        setResolutionText('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [onResolve, resolutionText],
  );

  if (!canvasName) {
    return (
      <div style={panelStyle}>
        <h3 style={headerStyle}>Validation</h3>
        <p style={dimStyle}>Select a canvas to start reviewing.</p>
      </div>
    );
  }

  const openFlags = flags.filter((f) => !f.resolvedAt);
  const resolvedFlags = flags.filter((f) => f.resolvedAt);

  return (
    <div style={panelStyle}>
      <h3 style={headerStyle}>Validation — {canvasName}</h3>

      <div style={reportControlsStyle}>
        <label style={checkRowStyle}>
          <input
            type="checkbox"
            checked={includePalette}
            onChange={(e) => setIncludePalette(e.target.checked)}
          />
          Palette violations
        </label>
        <label style={checkRowStyle}>
          <input
            type="checkbox"
            checked={includeAccessibility}
            onChange={(e) => setIncludeAccessibility(e.target.checked)}
          />
          Accessibility
        </label>
        <label style={checkRowStyle}>
          <input
            type="checkbox"
            checked={includeAsset}
            onChange={(e) => setIncludeAsset(e.target.checked)}
          />
          Asset specs
        </label>
        {(includePalette || includeAccessibility) && (
          <input
            type="text"
            value={paletteOverride}
            onChange={(e) => setPaletteOverride(e.target.value)}
            placeholder="Palette name override (optional)"
            style={{ width: '100%', marginTop: 4 }}
          />
        )}
      </div>

      <button
        style={primaryBtnStyle}
        onClick={async () => {
          setError(null);
          try {
            const includes: ReportInclude[] = [];
            if (includePalette) includes.push('palette');
            if (includeAccessibility) includes.push('accessibility');
            if (includeAsset) includes.push('asset');
            await onRunReport({
              includes,
              palette: paletteOverride.trim() || undefined,
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        Run auto-validate
      </button>

      {report && (
        <div style={reportBoxStyle}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Report</div>
          <div>Manual flags: {report.manual.length}</div>
          <div>Size violations: {(report.automatic.size ?? []).length}</div>
          {(report.automatic.size ?? []).map((s, i) => (
            <div key={i} style={dimStyle}>
              • {s.message}
            </div>
          ))}

          {report.automatic.palette && (
            <>
              <div style={reportSectionStyle}>
                Palette:{' '}
                {report.automatic.palette.reduce((n, p) => n + p.totalPixelsOutOfPalette, 0)} px off
                across {report.automatic.palette.length} frame(s)
              </div>
              {report.automatic.palette.map((p) => (
                <div key={p.frame} style={dimStyle}>
                  • frame {p.frame}: {p.totalPixelsOutOfPalette} px
                </div>
              ))}
            </>
          )}

          {report.automatic.accessibility && (
            <>
              <div style={reportSectionStyle}>
                Accessibility ({report.automatic.accessibility.paletteName}): score{' '}
                {report.automatic.accessibility.score}/100
              </div>
              <div style={dimStyle}>
                •{' '}
                {
                  report.automatic.accessibility.issues.filter(
                    (i) => i.severity === 'indistinguishable',
                  ).length
                }{' '}
                critical,{' '}
                {
                  report.automatic.accessibility.issues.filter((i) => i.severity === 'marginal')
                    .length
                }{' '}
                marginal
              </div>
            </>
          )}

          {report.automatic.asset && (
            <>
              <div style={reportSectionStyle}>
                Asset specs: {report.automatic.asset.length} checked,{' '}
                {report.automatic.asset.filter((a) => !a.valid).length} failing
              </div>
              {report.automatic.asset
                .filter((a) => !a.valid)
                .map((a) => (
                  <div key={a.asset} style={dimStyle}>
                    • {a.asset}: {a.issues.length} issue(s)
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      <h4 style={subHeaderStyle}>Add flag</h4>
      {error && <div style={errorStyle}>{error}</div>}

      <label style={fieldStyle}>
        <span style={labelStyle}>Severity</span>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as FlagSeverity)}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as FlagCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Describe the issue for the agent..."
          style={{ width: '100%' }}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Tags (comma-separated)</span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="body, outline"
        />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={scopeFrame}
            onChange={(e) => setScopeFrame(e.target.checked)}
          />
          Frame {frameIndex}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={scopeLayer}
            onChange={(e) => setScopeLayer(e.target.checked)}
            disabled={!activeLayerId}
          />
          Layer {activeLayerId ?? '(none)'}
        </label>
      </div>

      {selectedRegion && (
        <div style={{ ...dimStyle, marginBottom: 8 }}>
          Region: {selectedRegion.x},{selectedRegion.y} {selectedRegion.w}×{selectedRegion.h}
          <button style={linkBtnStyle} onClick={onClearRegion}>
            clear
          </button>
        </div>
      )}

      <button style={primaryBtnStyle} onClick={submit} disabled={submitting}>
        {submitting ? 'Saving...' : 'Create flag'}
      </button>

      <h4 style={subHeaderStyle}>Open flags ({openFlags.length})</h4>
      {openFlags.length === 0 && <p style={dimStyle}>No open flags.</p>}
      {openFlags.map((f) => (
        <div key={f.id} style={flagCardStyle(f.severity)}>
          <div style={{ fontWeight: 600 }}>
            {f.id} — {f.severity}/{f.category}
          </div>
          <div>{f.note}</div>
          {(f.frameIndex !== undefined || f.layerId || f.region) && (
            <div style={dimStyle}>
              {f.frameIndex !== undefined ? `frame ${f.frameIndex} ` : ''}
              {f.layerId ? `${f.layerId} ` : ''}
              {f.region ? `${f.region.x},${f.region.y} ${f.region.w}×${f.region.h}` : ''}
            </div>
          )}
          {resolvingId === f.id ? (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                type="text"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="How was it fixed?"
                style={{ flex: 1 }}
              />
              <button onClick={() => submitResolve(f.id)}>Save</button>
              <button onClick={() => setResolvingId(null)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button onClick={() => setResolvingId(f.id)}>Resolve</button>
              <button onClick={() => onRemove(f.id)}>Remove</button>
            </div>
          )}
        </div>
      ))}

      {resolvedFlags.length > 0 && (
        <>
          <h4 style={subHeaderStyle}>Resolved ({resolvedFlags.length})</h4>
          {resolvedFlags.map((f) => (
            <div key={f.id} style={{ ...flagCardStyle(f.severity), opacity: 0.6 }}>
              <div>
                {f.id} — {f.note}
              </div>
              <div style={dimStyle}>resolution: {f.resolution}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: 12,
  borderLeft: '1px solid var(--border, #333)',
  width: 340,
  overflowY: 'auto',
  background: 'var(--panel-bg, #1a1a1a)',
  color: 'var(--text, #eee)',
};
const headerStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const subHeaderStyle: React.CSSProperties = { margin: '16px 0 8px', fontSize: 13, opacity: 0.8 };
const dimStyle: React.CSSProperties = { opacity: 0.7, fontSize: 12 };
const fieldStyle: React.CSSProperties = { display: 'block', marginBottom: 8 };
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  opacity: 0.7,
  marginBottom: 2,
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'var(--accent, #4a90e2)',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  marginBottom: 8,
};
const linkBtnStyle: React.CSSProperties = {
  marginLeft: 8,
  background: 'transparent',
  color: 'var(--accent, #4a90e2)',
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
};
const errorStyle: React.CSSProperties = {
  padding: 6,
  background: 'rgba(220, 60, 60, 0.15)',
  color: '#ff7070',
  borderRadius: 3,
  marginBottom: 8,
  fontSize: 12,
};
const reportBoxStyle: React.CSSProperties = {
  padding: 8,
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 3,
  marginBottom: 8,
  fontSize: 12,
};
const reportControlsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginBottom: 6,
  fontSize: 12,
};
const checkRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4 };
const reportSectionStyle: React.CSSProperties = { marginTop: 6, fontWeight: 600 };
function flagCardStyle(severity: FlagSeverity): React.CSSProperties {
  const color = severity === 'error' ? '#d04040' : severity === 'warning' ? '#d08040' : '#4080d0';
  return {
    padding: 8,
    marginBottom: 6,
    borderLeft: `3px solid ${color}`,
    background: 'rgba(255,255,255,0.03)',
    fontSize: 12,
  };
}
