import { useState, useEffect, useCallback } from 'react';

interface FeedbackEntry {
  id: string;
  canvasName: string;
  frameIndex: number;
  rating: 'like' | 'dislike';
  reason?: string;
  tags: string[];
  timestamp: number;
}

interface Stats {
  total: number;
  likes: number;
  dislikes: number;
  likeRatio: number;
  tagCounts: Record<string, number>;
}

interface DatasetBrowserProps {
  open: boolean;
  onClose: () => void;
}

export function DatasetBrowser({ open, onClose }: DatasetBrowserProps) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [ratingFilter, setRatingFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (ratingFilter) params.set('rating', ratingFilter);
    if (tagFilter) params.set('tag', tagFilter);
    const res = await fetch(`/api/dataset?${params}`);
    if (res.ok) setEntries(await res.json());

    const statsRes = await fetch('/api/dataset/stats');
    if (statsRes.ok) setStats(await statsRes.json());
  }, [ratingFilter, tagFilter]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/dataset/${id}`, { method: 'DELETE' });
    refresh();
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" style={{ width: 520, maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span>Dataset Browser ({entries.length} entries)</span>
          <button className="dialog__close" onClick={onClose}>x</button>
        </div>

        <div className="dialog__body" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <div className="dataset-filters">
            <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="">All ratings</option>
              <option value="like">Likes only</option>
              <option value="dislike">Dislikes only</option>
            </select>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">All tags</option>
              {['composition', 'colors', 'animation', 'style', 'detail', 'proportions'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {entries.length === 0 ? (
            <div className="dataset-empty">No ratings yet. Rate canvases with Like/Dislike.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="dataset-entry">
                <img
                  className="dataset-entry__thumb"
                  src={`/api/dataset/${entry.id}/snapshot`}
                  alt={entry.canvasName}
                />
                <div className="dataset-entry__info">
                  <div className="dataset-entry__name">
                    {entry.rating === 'like' ? '\u{1F44D}' : '\u{1F44E}'} {entry.canvasName}
                  </div>
                  {entry.reason && <div className="dataset-entry__reason">"{entry.reason}"</div>}
                  {entry.tags.length > 0 && (
                    <div className="dataset-entry__tags">{entry.tags.join(', ')}</div>
                  )}
                </div>
                <button className="dataset-entry__delete" onClick={() => handleDelete(entry.id)}>x</button>
              </div>
            ))
          )}
        </div>

        {stats && (
          <div className="dataset-stats">
            <span>{stats.total} total</span>
            <span>{stats.likeRatio}% like</span>
            {Object.entries(stats.tagCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([tag, count]) => (
              <span key={tag}>{tag}: {count}</span>
            ))}
          </div>
        )}

        <div className="dialog__footer">
          <a href="/api/dataset/export?format=jsonl" download className="dialog__btn dialog__btn--primary">Export JSONL</a>
          <a href="/api/dataset/export?format=csv" download className="dialog__btn">Export CSV</a>
          <button className="dialog__btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
