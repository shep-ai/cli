/**
 * Feature Agent Process Service
 *
 * Infrastructure implementation of IFeatureAgentProcessService.
 * Manages background worker processes for feature agent execution
 * using Node.js child_process.fork().
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { join } from 'node:path';
import type { IFeatureAgentProcessService } from '@/application/ports/output/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agent-run-repository.interface.js';
import { AgentRunStatus } from '@/domain/generated/output.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Terminal statuses that should not be updated */
const TERMINAL_STATUSES = new Set<AgentRunStatus>([
  AgentRunStatus.completed,
  AgentRunStatus.failed,
  AgentRunStatus.interrupted,
  AgentRunStatus.cancelled,
]);

export class FeatureAgentProcessService implements IFeatureAgentProcessService {
  constructor(private readonly runRepository: IAgentRunRepository) {}

  spawn(
    featureId: string,
    runId: string,
    repoPath: string,
    specDir: string,
    worktreePath?: string
  ): number {
    const workerPath = join(__dirname, 'feature-agent-worker.js');

    const args = [
      '--feature-id',
      featureId,
      '--run-id',
      runId,
      '--repo',
      repoPath,
      '--spec-dir',
      specDir,
    ];
    if (worktreePath) {
      args.push('--worktree-path', worktreePath);
    }

    const child = fork(workerPath, args, {
      detached: true,
      stdio: 'ignore',
    });

    if (!child.pid) {
      throw new Error('Failed to spawn feature agent worker: no PID returned');
    }

    child.unref();
    return child.pid;
  }

  isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async checkAndMarkCrashed(runId: string): Promise<void> {
    const run = await this.runRepository.findById(runId);
    if (!run || !run.pid || TERMINAL_STATUSES.has(run.status)) {
      return;
    }

    if (!this.isAlive(run.pid)) {
      const now = new Date().toISOString();
      await this.runRepository.updateStatus(runId, AgentRunStatus.interrupted, {
        error: `Agent process (PID ${run.pid}) crashed or was killed`,
        completedAt: now,
        updatedAt: now,
      });
    }
  }
}
