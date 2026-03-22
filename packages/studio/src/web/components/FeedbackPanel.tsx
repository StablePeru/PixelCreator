import { useState, useCallback } from 'react';

const TAGS = ['composition', 'colors', 'animation', 'style', 'detail', 'proportions'];

interface FeedbackPanelProps {
  canvasName: string | null;
  frameIndex: number;
}

export function FeedbackPanel({ canvasName, frameIndex }: FeedbackPanelProps) {
  const [showModal, setShowModal] = useState<'like' | 'dislike' | null>(null);
  const [reason, setReason] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!canvasName || !showModal) return;
    setSubmitting(true);
    await fetch('/api/dataset/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canvas: canvasName,
        frame: frameIndex,
        rating: showModal,
        reason: reason || undefined,
        tags: selectedTags,
      }),
    });
    setSubmitting(false);
    setShowModal(null);
    setReason('');
    setSelectedTags([]);
  }, [canvasName, frameIndex, showModal, reason, selectedTags]);

  if (!canvasName) return null;

  return (
    <>
      <div className="feedback-strip">
        <button className="feedback-strip__btn feedback-strip__btn--like" onClick={() => setShowModal('like')}>
          {'\u{1F44D}'} Like
        </button>
        <button className="feedback-strip__btn feedback-strip__btn--dislike" onClick={() => setShowModal('dislike')}>
          {'\u{1F44E}'} Dislike
        </button>
      </div>

      {showModal && (
        <div className="dialog-overlay" onClick={() => setShowModal(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog__header">
              <span>Rate: {canvasName} (frame {frameIndex + 1})</span>
              <button className="dialog__close" onClick={() => setShowModal(null)}>x</button>
            </div>
            <div className="dialog__body">
              <div className="feedback-rating">
                {showModal === 'like' ? '\u{1F44D} Like' : '\u{1F44E} Dislike'}
              </div>

              <label className="dialog__field">
                <span>Why?</span>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason..." />
              </label>

              <div className="feedback-tags">
                <span className="feedback-tags__label">Tags:</span>
                <div className="feedback-tags__grid">
                  {TAGS.map((tag) => (
                    <label key={tag} className="feedback-tags__item">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => {
                          setSelectedTags((prev) =>
                            e.target.checked ? [...prev, tag] : prev.filter((t) => t !== tag),
                          );
                        }}
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="dialog__footer">
              <button className="dialog__btn dialog__btn--primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit'}
              </button>
              <button className="dialog__btn" onClick={() => setShowModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
