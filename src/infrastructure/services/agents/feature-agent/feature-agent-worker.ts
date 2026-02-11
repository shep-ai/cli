#!/usr/bin/env node
/**
 * Feature Agent Worker
 *
 * Background worker entry point that runs as a child process via fork().
 * Initializes DI, creates the feature agent graph, and executes it.
 *
 * CLI Args: --feature-id <id> --run-id <id> --repo <path> --spec-dir <path>
 */

import 'reflect-metadata';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { initializeContainer, container } from '@/infrastructure/di/container.js';
import { createFeatureAgentGraph } from './feature-agent-graph.js';
import { createCheckpointer } from '../common/checkpointer.js';
import type { IAgentRunRepository } from '@/application/ports/output/agent-run-repository.interface.js';
import { AgentRunStatus } from '@/domain/generated/output.js';

export interface WorkerArgs {
  featureId: string;
  runId: string;
  repo: string;
  specDir: string;
}

/**
 * Parse CLI arguments into a WorkerArgs object.
 * Throws if any required argument is missing.
 */
export function parseWorkerArgs(args: string[]): WorkerArgs {
  const getArg = (name: string): string => {
    const index = args.indexOf(`--${name}`);
    if (index === -1 || index + 1 >= args.length) {
      throw new Error(`Missing required argument: --${name}`);
    }
    return args[index + 1];
  };

  return {
    featureId: getArg('feature-id'),
    runId: getArg('run-id'),
    repo: getArg('repo'),
    specDir: getArg('spec-dir'),
  };
}

/**
 * Run the feature agent worker with the given arguments.
 * Initializes DI, creates the graph, and executes it.
 */
export async function runWorker(args: WorkerArgs): Promise<void> {
  await initializeContainer();

  const runRepository = container.resolve<IAgentRunRepository>('IAgentRunRepository');

  // Use a file-based checkpointer for persistence across restarts
  const checkpointPath = join(homedir(), '.shep', 'checkpoints', `${args.runId}.db`);
  const checkpointer = createCheckpointer(checkpointPath);
  const graph = createFeatureAgentGraph(checkpointer);

  // Mark the run as running with our PID
  const now = new Date().toISOString();
  await runRepository.updateStatus(args.runId, AgentRunStatus.running, {
    pid: process.pid,
    startedAt: now,
    updatedAt: now,
  });

  try {
    const result = await graph.invoke(
      {
        featureId: args.featureId,
        repositoryPath: args.repo,
        specDir: args.specDir,
      },
      { configurable: { thread_id: args.runId } }
    );

    // Check if the graph itself reported an error in state
    if (result.error) {
      const failedAt = new Date().toISOString();
      await runRepository.updateStatus(args.runId, AgentRunStatus.failed, {
        error: result.error,
        completedAt: failedAt,
        updatedAt: failedAt,
      });
      return;
    }

    const completedAt = new Date().toISOString();
    await runRepository.updateStatus(args.runId, AgentRunStatus.completed, {
      result: result.messages?.join('\n') ?? '',
      completedAt,
      updatedAt: completedAt,
    });
  } catch (error: unknown) {
    const failedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);
    await runRepository.updateStatus(args.runId, AgentRunStatus.failed, {
      error: message,
      completedAt: failedAt,
      updatedAt: failedAt,
    });
  }
}

// Handle SIGTERM for graceful shutdown
let runIdForSignal: string | undefined;
let runRepoForSignal: IAgentRunRepository | undefined;

process.on('SIGTERM', async () => {
  if (runIdForSignal && runRepoForSignal) {
    const now = new Date().toISOString();
    await runRepoForSignal.updateStatus(runIdForSignal, AgentRunStatus.interrupted, {
      error: 'Process received SIGTERM',
      completedAt: now,
      updatedAt: now,
    });
  }
  process.exit(0);
});

// Main execution when run as a script
const isMainModule =
  typeof require !== 'undefined'
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const args = parseWorkerArgs(process.argv.slice(2));
  runIdForSignal = args.runId;

  runWorker(args)
    .then(() => {
      // Get the repository reference for signal handler after container init
      runRepoForSignal = container.resolve<IAgentRunRepository>('IAgentRunRepository');
      process.exit(0);
    })
    .catch((err: unknown) => {
      process.stderr.write(
        `Worker fatal error: ${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    });
}
