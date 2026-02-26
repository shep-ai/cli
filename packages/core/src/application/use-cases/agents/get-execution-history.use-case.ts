/**
 * Get Execution History Use Case
 *
 * Fetches flat ExecutionStep rows from the repository, assembles
 * them into a hierarchical tree, computes total durations, and
 * returns an ExecutionHistoryDTO for presentation layer consumption.
 */

import type { IExecutionStepRepository } from '../../ports/output/agents/execution-step-repository.interface.js';
import type { ExecutionStep } from '../../../domain/generated/output.js';
import { ExecutionStepStatus, ExecutionStepType } from '../../../domain/generated/output.js';
import type { ExecutionHistoryDTO, ExecutionStepDTO } from '../../dtos/execution-history.dto.js';

interface ExecuteInput {
  agentRunId?: string;
  featureId?: string;
}

/**
 * Assembles flat execution steps into a tree and computes totals.
 */
export class GetExecutionHistoryUseCase {
  constructor(private readonly stepRepository: IExecutionStepRepository) {}

  async execute(input: ExecuteInput): Promise<ExecutionHistoryDTO> {
    const steps = input.featureId
      ? await this.stepRepository.findByFeatureId(input.featureId)
      : await this.stepRepository.findByRunId(input.agentRunId!);

    const tree = assembleTree(steps);

    const totalDurationMs = tree.reduce((sum, step) => {
      return sum + (step.durationMs ?? 0);
    }, 0);

    const totalWaitMs = computeTotalWaitMs(steps);

    return {
      agentRunId: input.agentRunId ?? (steps[0]?.agentRunId || ''),
      featureId: input.featureId,
      steps: tree,
      totalDurationMs,
      totalWaitMs,
    };
  }
}

function toDTO(step: ExecutionStep): ExecutionStepDTO {
  let durationMs: number | undefined;
  if (step.durationMs != null) {
    durationMs = Number(step.durationMs);
  } else if (step.status === ExecutionStepStatus.running) {
    durationMs = Date.now() - new Date(step.startedAt).getTime();
  }

  let metadata: Record<string, unknown> | undefined;
  if (step.metadata) {
    try {
      metadata = JSON.parse(step.metadata);
    } catch {
      metadata = { raw: step.metadata };
    }
  }

  return {
    id: step.id,
    name: step.name,
    type: step.type,
    status: step.status,
    startedAt: step.startedAt instanceof Date ? step.startedAt : new Date(step.startedAt),
    ...(step.completedAt && {
      completedAt: step.completedAt instanceof Date ? step.completedAt : new Date(step.completedAt),
    }),
    durationMs,
    outcome: step.outcome,
    metadata,
    children: [],
  };
}

function assembleTree(steps: ExecutionStep[]): ExecutionStepDTO[] {
  const dtoMap = new Map<string, ExecutionStepDTO>();
  const roots: ExecutionStepDTO[] = [];

  // Create all DTOs first
  for (const step of steps) {
    dtoMap.set(step.id, toDTO(step));
  }

  // Link parents and children
  for (const step of steps) {
    const dto = dtoMap.get(step.id)!;
    if (step.parentId && dtoMap.has(step.parentId)) {
      dtoMap.get(step.parentId)!.children.push(dto);
    } else {
      roots.push(dto);
    }
  }

  // Sort children by sequenceNumber (steps come from DB ordered, but re-sort to be safe)
  for (const dto of dtoMap.values()) {
    dto.children.sort((a, b) => {
      const seqA = steps.find((s) => s.id === a.id)?.sequenceNumber ?? 0;
      const seqB = steps.find((s) => s.id === b.id)?.sequenceNumber ?? 0;
      return seqA - seqB;
    });
  }

  return roots;
}

function computeTotalWaitMs(steps: ExecutionStep[]): number {
  return steps
    .filter((s) => s.type === ExecutionStepType.approvalWait)
    .reduce((sum, s) => sum + (s.durationMs != null ? Number(s.durationMs) : 0), 0);
}
