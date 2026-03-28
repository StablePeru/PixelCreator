import type { WsBroadcaster } from '../ws/handler.js';
import type {
  AgentSession,
  AgentSessionStatus,
  AgentOperation,
  OperationFeedback,
  AgentSessionSummary,
} from '@pixelcreator/core';

export interface CommandLogEntry {
  id: string;
  timestamp: number;
  operation: string;
  canvas?: string;
  args?: Record<string, unknown>;
  success: boolean;
  source: 'api' | 'external';
  duration?: number;
}

interface PendingOperation {
  operation: AgentOperation;
  resolve: (approved: boolean) => void;
}

export class AgentBridge {
  private log: CommandLogEntry[] = [];
  private maxLog = 200;
  private broadcaster: WsBroadcaster | null = null;

  // Agent session state
  private session: AgentSession | null = null;
  private pendingOp: PendingOperation | null = null;
  private maxOperationsPerSession = 200;

  setBroadcaster(broadcaster: WsBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  // --- Command logging (existing) ---

  logCommand(entry: Omit<CommandLogEntry, 'id' | 'timestamp'>): CommandLogEntry {
    const full: CommandLogEntry = {
      ...entry,
      id: `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    this.log.push(full);
    if (this.log.length > this.maxLog) this.log.shift();

    this.broadcaster?.broadcast('agent:command-complete', full);
    return full;
  }

  logExternalChange(canvasName: string): void {
    this.logCommand({
      operation: 'canvas:updated',
      canvas: canvasName,
      success: true,
      source: 'external',
    });
  }

  getLog(): CommandLogEntry[] {
    return [...this.log];
  }

  clear(): void {
    this.log.length = 0;
  }

  // --- Agent session management ---

  startSession(canvas: string): AgentSession {
    if (this.session && this.session.status !== 'completed') {
      throw new Error('A session is already active. End it before starting a new one.');
    }

    this.session = {
      id: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'running',
      startedAt: Date.now(),
      canvas,
      operations: [],
      totalApproved: 0,
      totalRejected: 0,
      totalAuto: 0,
    };

    this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
    return { ...this.session };
  }

  pauseSession(): AgentSession {
    if (!this.session || this.session.status === 'completed') {
      throw new Error('No active session to pause.');
    }
    this.session = { ...this.session, status: 'paused' };
    this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
    return { ...this.session };
  }

  resumeSession(): AgentSession {
    if (!this.session || this.session.status !== 'paused') {
      throw new Error('No paused session to resume.');
    }
    this.session = { ...this.session, status: 'running' };
    this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
    return { ...this.session };
  }

  endSession(): AgentSessionSummary {
    if (!this.session) {
      throw new Error('No active session to end.');
    }

    const endedAt = Date.now();
    this.session = { ...this.session, status: 'completed', endedAt };

    // Reject any pending operation
    if (this.pendingOp) {
      this.pendingOp.resolve(false);
      this.pendingOp = null;
    }

    const summary: AgentSessionSummary = {
      sessionId: this.session.id,
      canvas: this.session.canvas,
      duration: endedAt - this.session.startedAt,
      totalOperations: this.session.operations.length,
      approved: this.session.totalApproved,
      rejected: this.session.totalRejected,
      auto: this.session.totalAuto,
      feedbackCount: this.session.operations.filter(op => op.feedback).length,
    };

    this.broadcaster?.broadcast('agent:session-end', summary);
    return summary;
  }

  getSession(): AgentSession | null {
    return this.session ? { ...this.session } : null;
  }

  getSessionStatus(): AgentSessionStatus {
    return this.session?.status ?? 'idle';
  }

  isSessionActive(): boolean {
    return this.session !== null && this.session.status !== 'completed';
  }

  // Register an incoming agent operation during a session.
  // In 'paused' mode, returns a Promise that resolves when the user approves/rejects.
  // In 'running' mode, auto-approves and resolves immediately.
  async registerOperation(command: string, args: Record<string, unknown>): Promise<boolean> {
    if (!this.session || this.session.status === 'completed') {
      return true; // No session — execute freely
    }

    const operation: AgentOperation = {
      id: `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: this.session.id,
      command,
      args,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.session = {
      ...this.session,
      operations: [...this.session.operations.slice(-this.maxOperationsPerSession + 1), operation],
    };

    if (this.session.status === 'running') {
      // Auto-approve in running mode
      this.updateOperationStatus(operation.id, 'auto');
      this.session = { ...this.session, totalAuto: this.session.totalAuto + 1 };
      this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
      return true;
    }

    // Paused mode — wait for user approval
    this.broadcaster?.broadcast('agent:operation-pending', {
      operation,
      session: this.getSessionPublic(),
    });

    return new Promise<boolean>((resolve) => {
      this.pendingOp = { operation, resolve };
    });
  }

  approveOperation(operationId: string): boolean {
    if (!this.pendingOp || this.pendingOp.operation.id !== operationId) {
      return false;
    }
    this.updateOperationStatus(operationId, 'approved');
    if (this.session) {
      this.session = { ...this.session, totalApproved: this.session.totalApproved + 1 };
    }
    this.pendingOp.resolve(true);
    this.pendingOp = null;
    this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
    return true;
  }

  rejectOperation(operationId: string): boolean {
    if (!this.pendingOp || this.pendingOp.operation.id !== operationId) {
      return false;
    }
    this.updateOperationStatus(operationId, 'rejected');
    if (this.session) {
      this.session = { ...this.session, totalRejected: this.session.totalRejected + 1 };
    }
    this.pendingOp.resolve(false);
    this.pendingOp = null;
    this.broadcaster?.broadcast('agent:session-update', this.getSessionPublic());
    return true;
  }

  addOperationFeedback(operationId: string, feedback: OperationFeedback): boolean {
    if (!this.session) return false;

    const idx = this.session.operations.findIndex(op => op.id === operationId);
    if (idx === -1) return false;

    const updated = { ...this.session.operations[idx], feedback };
    const operations = [...this.session.operations];
    operations[idx] = updated;
    this.session = { ...this.session, operations };

    this.broadcaster?.broadcast('agent:operation-feedback', { operationId, feedback });
    return true;
  }

  getPendingOperation(): AgentOperation | null {
    return this.pendingOp ? { ...this.pendingOp.operation } : null;
  }

  // --- Private helpers ---

  private updateOperationStatus(operationId: string, status: AgentOperation['status']): void {
    if (!this.session) return;
    const idx = this.session.operations.findIndex(op => op.id === operationId);
    if (idx === -1) return;

    const updated = { ...this.session.operations[idx], status };
    const operations = [...this.session.operations];
    operations[idx] = updated;
    this.session = { ...this.session, operations };
  }

  private getSessionPublic(): AgentSession {
    if (!this.session) throw new Error('No session');
    // Return session with only last 50 operations to keep WS messages small
    return {
      ...this.session,
      operations: this.session.operations.slice(-50),
    };
  }
}
