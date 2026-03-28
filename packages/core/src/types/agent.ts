// Agent session types for AI-assisted drawing with real-time feedback

export type AgentSessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export type OperationStatus = 'pending' | 'approved' | 'rejected' | 'auto';

export interface OperationFeedback {
  rating: 'approve' | 'reject';
  comment?: string;
  tags?: string[];
}

export interface AgentOperation {
  id: string;
  sessionId: string;
  command: string;
  args: Record<string, unknown>;
  timestamp: number;
  status: OperationStatus;
  duration?: number;
  feedback?: OperationFeedback;
}

export interface AgentSession {
  id: string;
  status: AgentSessionStatus;
  startedAt: number;
  endedAt?: number;
  canvas: string;
  operations: AgentOperation[];
  totalApproved: number;
  totalRejected: number;
  totalAuto: number;
}

export interface AgentSessionSummary {
  sessionId: string;
  canvas: string;
  duration: number;
  totalOperations: number;
  approved: number;
  rejected: number;
  auto: number;
  feedbackCount: number;
}
