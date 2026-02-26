/**
 * Execution Monitor
 *
 * Provides a clean API for recording hierarchical execution steps.
 * Wraps IExecutionStepRepository with startStep, completeStep, failStep,
 * and startSubStep methods. All operations swallow errors (non-fatal).
 *
 * Replaces the module-level phase-timing-context singleton with an
 * instance-based approach that supports nested sub-steps.
 */

import { randomUUID } from 'node:crypto';
import type { IExecutionStepRepository } from '../../../../application/ports/output/agents/execution-step-repository.interface.js';
import { ExecutionStepStatus, ExecutionStepType } from '../../../../domain/generated/output.js';
import type { ExecutionStep } from '../../../../domain/generated/output.js';

export class ExecutionMonitor {
  private stepStartTimes = new Map<string, number>();

  constructor(
    private readonly agentRunId: string,
    private readonly repository: IExecutionStepRepository
  ) {}

  /**
   * Start a new root-level step. Returns step ID or null on error.
   */
  async startStep(
    name: string,
    type: ExecutionStepType,
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    return this.createStep(name, type, null, metadata);
  }

  /**
   * Start a sub-step under a parent step. Returns step ID or null on error.
   */
  async startSubStep(
    parentId: string,
    name: string,
    type: ExecutionStepType,
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    return this.createStep(name, type, parentId, metadata);
  }

  /**
   * Complete a step with optional outcome and metadata.
   */
  async completeStep(
    stepId: string,
    outcome?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const now = new Date();
      const startTime = this.stepStartTimes.get(stepId);
      const durationMs = startTime ? BigInt(now.getTime() - startTime) : BigInt(0);
      this.stepStartTimes.delete(stepId);

      await this.repository.update(stepId, {
        status: ExecutionStepStatus.completed,
        completedAt: now,
        durationMs,
        ...(outcome && { outcome }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      });
    } catch {
      // Non-fatal — monitoring must never block graph execution
    }
  }

  /**
   * Fail a step with an error message.
   */
  async failStep(
    stepId: string,
    error?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const now = new Date();
      const startTime = this.stepStartTimes.get(stepId);
      const durationMs = startTime ? BigInt(now.getTime() - startTime) : BigInt(0);
      this.stepStartTimes.delete(stepId);

      const mergedMeta = { ...metadata, ...(error && { error }) };

      await this.repository.update(stepId, {
        status: ExecutionStepStatus.failed,
        completedAt: now,
        durationMs,
        outcome: 'failed',
        ...(Object.keys(mergedMeta).length > 0 && {
          metadata: JSON.stringify(mergedMeta),
        }),
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Merge additional metadata into an existing step.
   */
  async recordMetadata(stepId: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.repository.update(stepId, {
        metadata: JSON.stringify(metadata),
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Record an instant lifecycle event (e.g., run:started, run:completed).
   */
  async recordLifecycleEvent(name: string): Promise<void> {
    try {
      const now = new Date();
      const seqNum = await this.repository.getNextSequenceNumber(this.agentRunId, null);
      const step: ExecutionStep = {
        id: randomUUID(),
        agentRunId: this.agentRunId,
        name,
        type: ExecutionStepType.lifecycleEvent,
        status: ExecutionStepStatus.completed,
        startedAt: now,
        completedAt: now,
        durationMs: BigInt(0),
        sequenceNumber: seqNum,
        createdAt: now,
        updatedAt: now,
      };
      await this.repository.save(step);
    } catch {
      // Non-fatal
    }
  }

  private async createStep(
    name: string,
    type: ExecutionStepType,
    parentId: string | null,
    metadata?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const id = randomUUID();
      const now = new Date();
      const seqNum = await this.repository.getNextSequenceNumber(this.agentRunId, parentId);

      const step: ExecutionStep = {
        id,
        agentRunId: this.agentRunId,
        name,
        type,
        status: ExecutionStepStatus.running,
        startedAt: now,
        sequenceNumber: seqNum,
        createdAt: now,
        updatedAt: now,
        ...(parentId && { parentId }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      };

      await this.repository.save(step);
      this.stepStartTimes.set(id, now.getTime());
      return id;
    } catch {
      return null;
    }
  }
}
