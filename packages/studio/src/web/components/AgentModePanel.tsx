import { useState, useCallback } from 'react';
import { AgentTimeline } from './AgentTimeline';
import type { AgentSession, AgentOperation, OperationFeedback } from '@pixelcreator/core';

const FEEDBACK_TAGS = ['composition', 'colors', 'animation', 'style', 'detail', 'proportions'];

interface AgentModePanelProps {
  session: AgentSession | null;
  isActive: boolean;
  isPaused: boolean;
  pendingOperation: AgentOperation | null;
  canvasName: string | null;
  onStart: (canvas: string) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onEnd: () => Promise<void>;
  onApprove: (operationId: string) => Promise<void>;
  onReject: (operationId: string) => Promise<void>;
  onSendFeedback: (operationId: string, feedback: OperationFeedback) => Promise<void>;
  onClose: () => void;
  visible: boolean;
}

export function AgentModePanel({
  session,
  isActive,
  isPaused,
  pendingOperation,
  canvasName,
  onStart,
  onPause,
  onResume,
  onEnd,
  onApprove,
  onReject,
  onSendFeedback,
  onClose,
  visible,
}: AgentModePanelProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);

  const statusLabel = session?.status ?? 'idle';
  const dotClass = isPaused ? 'agent-mode__dot--paused' :
    isActive ? 'agent-mode__dot--running' : 'agent-mode__dot--idle';

  const handleStart = useCallback(async () => {
    if (canvasName) await onStart(canvasName);
  }, [canvasName, onStart]);

  const handleApprove = useCallback(async () => {
    if (pendingOperation) await onApprove(pendingOperation.id);
  }, [pendingOperation, onApprove]);

  const handleReject = useCallback(async () => {
    if (pendingOperation) await onReject(pendingOperation.id);
  }, [pendingOperation, onReject]);

  const toggleTag = useCallback((tag: string) => {
    setFeedbackTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSendFeedback = useCallback(async () => {
    if (!feedbackTarget) return;
    await onSendFeedback(feedbackTarget, {
      rating: 'approve',
      comment: feedbackText || undefined,
      tags: feedbackTags.length > 0 ? feedbackTags : undefined,
    });
    setFeedbackText('');
    setFeedbackTags([]);
    setFeedbackTarget(null);
  }, [feedbackTarget, feedbackText, feedbackTags, onSendFeedback]);

  const handleSelectOperation = useCallback((op: AgentOperation) => {
    setFeedbackTarget(op.id);
  }, []);

  return (
    <div className={`agent-mode ${!visible ? 'agent-mode--hidden' : ''}`}>
      <div className="agent-mode__header">
        <span>Agent Mode</span>
        <div className="agent-mode__status">
          <span className={`agent-mode__dot ${dotClass}`} />
          {statusLabel}
        </div>
        <button className="dialog__close" onClick={onClose}>x</button>
      </div>

      <div className="agent-mode__controls">
        {!isActive ? (
          <button
            className="agent-mode__btn agent-mode__btn--primary"
            onClick={handleStart}
            disabled={!canvasName}
          >
            Start Session
          </button>
        ) : (
          <>
            {isPaused ? (
              <button className="agent-mode__btn agent-mode__btn--primary" onClick={onResume}>
                Resume
              </button>
            ) : (
              <button className="agent-mode__btn" onClick={onPause}>
                Pause
              </button>
            )}
            <button className="agent-mode__btn agent-mode__btn--danger" onClick={onEnd}>
              End
            </button>
          </>
        )}
      </div>

      {isActive && session && (
        <div className="agent-mode__stats">
          <span className="agent-mode__stat agent-mode__stat--approved">
            {'\u2713'} {session.totalApproved} approved
          </span>
          <span className="agent-mode__stat agent-mode__stat--rejected">
            {'\u2717'} {session.totalRejected} rejected
          </span>
          <span className="agent-mode__stat">
            {'\u26A1'} {session.totalAuto} auto
          </span>
        </div>
      )}

      {pendingOperation && (
        <div className="agent-mode__pending">
          <div className="agent-mode__pending-label">Pending Approval</div>
          <div className="agent-mode__pending-command">{pendingOperation.command}</div>
          {pendingOperation.args && Object.keys(pendingOperation.args).length > 0 && (
            <div className="agent-mode__pending-args">
              {JSON.stringify(pendingOperation.args, null, 2)}
            </div>
          )}
          <div className="agent-mode__pending-actions">
            <button className="agent-mode__btn agent-mode__btn--primary" onClick={handleApprove}>
              Approve
            </button>
            <button className="agent-mode__btn agent-mode__btn--danger" onClick={handleReject}>
              Reject + Undo
            </button>
          </div>
        </div>
      )}

      {feedbackTarget && (
        <div className="agent-mode__feedback">
          <textarea
            className="agent-mode__feedback-input"
            placeholder="Feedback for this operation..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
          />
          <div className="agent-mode__feedback-tags">
            {FEEDBACK_TAGS.map(tag => (
              <button
                key={tag}
                className={`agent-mode__tag ${feedbackTags.includes(tag) ? 'agent-mode__tag--active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
            <button className="agent-mode__btn agent-mode__btn--primary" onClick={handleSendFeedback}>
              Send Feedback
            </button>
            <button className="agent-mode__btn" onClick={() => setFeedbackTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <AgentTimeline
        operations={session?.operations ?? []}
        onSelectOperation={handleSelectOperation}
      />
    </div>
  );
}
